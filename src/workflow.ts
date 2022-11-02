import { debug, endGroup, getInput, info, startGroup } from '@actions/core';
import { create } from '@actions/artifact';
import { getOctokit } from '@actions/github';
import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import unzipper from 'unzipper';
import { downloadFile } from './util';
import WorkingDirectory from './working_directory';
import { getInputValue } from './action_input';

export async function getCurrentWorkflowId(owner: string, repo: string, workflow: string) {
    const octokit = getOctokit(getInputValue('token'));
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: owner,
        repo: repo
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return workflows.data.workflows.find(w => w.name === workflow)!.id;
}

export async function uploadArtifact(workingDirectory: WorkingDirectory) {
    if ('ACT' in process.env) {
        debug('Local act test environment detected. Skipping artifact upload');
        return;
    }

    startGroup('Upload generated ZIP file as artifact');
    const response = await create().uploadArtifact(getInputValue('artifact_name'), [workingDirectory.outputFile], workingDirectory.path);
    endGroup();

    if (response.artifactItems.length === 0 || response.failedItems.length > 0) {
        throw new Error('Artifact upload failed');
    }
}

export async function downloadLatestArtifact(workingDirectory: WorkingDirectory, owner: string, repo: string, branch: string, workflowId: number, artifactName: string, destinationPath: string) {
    info(`Downloading latest ${artifactName} artifact`);

    const octokit = getOctokit(getInputValue('token'));

    debug(`Getting latest run information for ${artifactName} artifact (repository: ${owner}/${repo}, branch: ${branch}, workflow ID: ${workflowId})`);
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner: owner,
        repo: repo
    });
    const latestRun = workflows.data.workflow_runs
        .filter(r => r.head_branch === branch && r.workflow_id === workflowId && r.status === 'completed' && r.conclusion === 'success')
        .sort((r, s) => s.run_number - r.run_number)[0];
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

async function extractFile(zip: string, path: string) {
    const directory = await unzipper.Open.file(zip);
    return new Promise((resolve, reject) => {
        directory.files[0].stream().pipe(createWriteStream(path)).on('error', reject).on('finish', resolve);
    });
}
