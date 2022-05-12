import { debug, endGroup, getInput, info, startGroup } from '@actions/core';
import { create } from '@actions/artifact';
import { getOctokit } from '@actions/github';
import { Options } from './options';
import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import unzipper from 'unzipper';
import { downloadFile } from './util';

/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} workflow
 * @returns {Promise<number>}
 */
export async function getCurrentWorkflowId(owner, repo, workflow) {
    const octokit = getOctokit(getInput(Options.Token));
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: owner,
        repo: repo
    });
    return workflows.data.workflows.find(w => w.name === workflow).id;
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function uploadArtifact(workingDirectory) {
    startGroup('Upload generated ZIP file as artifact');
    const response = await create().uploadArtifact(getInput(Options.ArtifactName), [workingDirectory.outputFile], workingDirectory.path);
    endGroup();
    if (response.artifactItems.length === 0 || response.failedItems.length > 0) {
        throw new Error('Artifact upload failed');
    }
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {number} workflowId
 * @param {string} artifactName
 * @param {string} destinationPath
 * @returns {Promise<void>}
 */
export async function downloadLatestArtifact(workingDirectory, owner, repo, branch, workflowId, artifactName, destinationPath) {
    info(`Downloading latest ${artifactName} artifact`);
    const octokit = getOctokit(getInput(Options.Token));
    debug(`Getting latest run information for ${artifactName} artifact (repository: ${owner}/${repo}, branch: ${branch}, workflow ID: ${workflowId})`);
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: owner,
        repo: repo
    });
    const latestRun = workflows.data.workflow_runs
        .filter(j => j.head_branch === branch && j.workflow_id === workflowId && j.status === 'completed' && j.conclusion === 'success')
        .sort(j => j.run_number)[0];
    if (!latestRun) {
        throw new Error(`Could not get the latest run information for the ${artifactName} artifact`);
    }
    debug(`Getting latest ${artifactName} artifact data`);
    const artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
        owner: owner,
        repo: repo,
        run_id: latestRun.id
    });
    const artifact = artifacts.data.artifacts.find(a => a.name === artifactName);
    if (!artifact) {
        throw new Error(`Could not get the latest ${artifactName} artifact data (#${latestRun.run_number})`);
    }
    const zip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
        owner: owner,
        repo: repo,
        artifact_id: artifact.id,
        archive_format: 'zip'
    });
    debug(`Extracting ${artifactName} artifact archive (#${latestRun.run_number})`);
    await downloadFile(zip.url, workingDirectory.artifactFile).catch(() => {
        throw new Error(`Could not download the latest ${artifactName} artifact`);
    });
    await extractFile(workingDirectory.artifactFile, destinationPath);
    await rm(workingDirectory.artifactFile);
    info(`Successfully downloaded the latest ${artifactName} artifact`);
}

/**
 * @param {string} zip
 * @param {string} path
 * @returns {Promise<void>}
 */
async function extractFile(zip, path) {
    const directory = await unzipper.Open.file(zip);
    return new Promise((resolve, reject) => {
        directory.files[0].stream().pipe(createWriteStream(path)).on('error', reject).on('finish', resolve);
    });
}
