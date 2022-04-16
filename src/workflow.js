import { debug, endGroup, getInput, info, startGroup } from '@actions/core';
import { create } from '@actions/artifact';
import { context, getOctokit } from '@actions/github';
import { Options } from './options';
import { exec } from '@actions/exec';
import { writeFileSync } from 'fs';

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
    return workflows.data.workflows.filter(j => j.name === workflow)[0].id;
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function uploadArtifact(workingDirectory) {
    startGroup('Upload generated ZIP file as artifact');
    const response = await create().uploadArtifact(getInput(Options.ArtifactName), [workingDirectory.zip], workingDirectory.path);
    endGroup();
    if (response.artifactItems.length === 0 || response.failedItems.length > 0) {
        process.exit(1);
    }
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<number>}
 */
export async function downloadLatestArtifact(workingDirectory) {
    const artifactName = getInput(Options.ArtifactName);
    info(`Downloading latest ${artifactName} artifact`);
    const octokit = getOctokit(getInput(Options.Token));
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const branch = context.ref.split('/')[2];
    const workflowId = await getCurrentWorkflowId(owner, repo, context.workflow);
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
    const artifact = artifacts.data.artifacts.filter(j => j.name === artifactName)[0];
    if (!artifact) {
        info(`Could not get the download URL for the latest ${artifactName} artifact`);
        return 2;
    }
    const zip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
        owner: owner,
        repo: repo,
        artifact_id: artifact.id,
        archive_format: 'zip'
    });
    await exec('wget', ['-O', workingDirectory.artifact, zip.url], { silent: true });
    await exec('unzip', ['-o', workingDirectory.artifact, '-d', workingDirectory.path], { silent: true });
    return 0;
}
