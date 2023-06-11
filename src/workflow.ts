import { debug, endGroup, info, startGroup } from '@actions/core';
import { create } from '@actions/artifact';
import WorkingDirectory from './working_directory';
import { getInputValue } from './action_input';
import octokit from './octokit';
import { HttpClient } from '@actions/http-client';
import { pipeline } from 'node:stream/promises';
import { extractFirstFileFromZip } from './util';
import { PackSquashOptions } from './packsquash_options';
import { dirname } from 'path';

export async function getCurrentWorkflowId(owner: string, repo: string, workflow: string) {
    const workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: owner,
        repo: repo
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return workflows.data.workflows.find(w => w.name === workflow)!.id;
}

export async function uploadArtifact(packSquashOptions: PackSquashOptions) {
    if ('ACT' in process.env) {
        debug('Local act test environment detected. Skipping artifact upload');
        return;
    }

    startGroup('Upload generated ZIP file as artifact');
    const outputFilePath = packSquashOptions.getOutputFilePath();
    const response = await create().uploadArtifact(getInputValue('artifact_name'), [outputFilePath], dirname(outputFilePath));
    endGroup();

    if (response.artifactItems.length === 0 || response.failedItems.length > 0) {
        throw new Error('Artifact upload failed');
    }
}

export async function downloadLatestArtifact(workingDirectory: WorkingDirectory, owner: string, repo: string, branch: string, workflowId: number, artifactName: string, destinationPath: string) {
    info(`Downloading latest ${artifactName} artifact`);

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

    const zip = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip', {
        owner: owner,
        repo: repo,
        artifact_id: artifact.id
    });

    debug(`Extracting ${artifactName} artifact archive (#${latestRun.run_number})`);
    try {
        await pipeline((await new HttpClient().get(zip.url)).message, workingDirectory.temporaryDownloadFileWriteStream);
    } catch {
        throw new Error(`Could not download the latest ${artifactName} artifact`);
    }
    await extractFirstFileFromZip(workingDirectory.temporaryDownloadFile, destinationPath);

    info(`Successfully downloaded the latest ${artifactName} artifact`);
}
