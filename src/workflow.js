import { debug, endGroup, getInput, info, startGroup } from '@actions/core';
import { create } from '@actions/artifact';
import { getOctokit } from '@actions/github';
import { Options } from './options';
import { exec } from '@actions/exec';
import { createWriteStream, rmSync } from 'fs';
import unzipper from 'unzipper';

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
        process.exit(1);
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
 * @returns {Promise<number>}
 */
export async function downloadLatestArtifact(workingDirectory, owner, repo, branch, workflowId, artifactName, destinationPath) {
    info(`Downloading latest ${artifactName} artifact`);
    const octokit = getOctokit(getInput(Options.Token));
    debug(`Getting API endpoint for latest ${artifactName} artifact (repository: ${owner}/${repo}, branch: ${branch}, workflow ID: ${workflowId})`);
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: owner,
        repo: repo
    });
    const latestRun = workflows.data.workflow_runs
        .filter(j => j.head_branch === branch && j.workflow_id === workflowId && j.status === 'completed' && j.conclusion === 'success')
        .sort(j => j.run_number)[0];
    if (!latestRun) {
        info(`Could not get the information API endpoint for the latest ${artifactName} artifacts`);
        return 1;
    }
    debug(`Getting latest ${artifactName} artifact download URL from endpoint`);
    const artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
        owner: owner,
        repo: repo,
        run_id: latestRun.id
    });
    const artifact = artifacts.data.artifacts.find(a => a.name === artifactName);
    if (!artifact) {
        info(`Could not get the download URL for the latest ${artifactName} artifact (#${latestRun.run_number})`);
        return 2;
    }
    const zip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
        owner: owner,
        repo: repo,
        artifact_id: artifact.id,
        archive_format: 'zip'
    });
    debug(`Extracting ${artifactName} artifact archive (#${latestRun.run_number})`);
    if (await exec('curl', ['-sSL', '-o', workingDirectory.artifactFile, zip.url], { silent: true })) {
        info(`Could not download the latest ${artifactName} artifact`);
        return 3;
    }
    await extractFile(workingDirectory.artifactFile, destinationPath);
    rmSync(workingDirectory.artifactFile);
    info(`Successfully downloaded the latest ${artifactName} artifact`);
    return 0;
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
