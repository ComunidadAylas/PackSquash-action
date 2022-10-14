import { endGroup, getInput, info, startGroup, warning } from '@actions/core';
import { restoreCache, saveCache } from '@actions/cache';
import { context } from '@actions/github';
import { downloadLatestArtifact, getCurrentWorkflowId } from './workflow';
import { Options } from './options';
import { getBranchName, md5Hash } from './util';
import WorkingDirectory from './working_directory';

export async function computeCacheKey(workingDirectory: WorkingDirectory) {
    const optionsHash = await md5Hash(workingDirectory.optionsFile);
    const cacheRevision = Buffer.from(getInput(Options.ActionCacheRevision)).toString('base64');
    // Using different primary and restore keys is necessary to handle jobs
    // executing concurrently: if a job tries to write to a cache key that is
    // already being written to by another job, it will error out
    const restoreKey = `packsquash-0-${cacheRevision}-${getInput(Options.PackSquashVersion)}-${optionsHash}`;
    const primaryKey = `${restoreKey}-${context.runId}-${context.job}`;
    return [primaryKey, restoreKey];
}

/**
 * Restore the system ID file from the cache and the pack ZIP from the previous
 * artifact if needed, and if this workflow has been run at least once
 * @returns The restored cache key, or undefined if no cache was restored
 */
export async function restorePackSquashCache(workingDirectory: WorkingDirectory, key: string, restoreKeys: string[]) {
    startGroup('Restoring cached data');
    const restoredCacheKey = await restoreCache([workingDirectory.systemIdFile], key, restoreKeys);
    if (restoredCacheKey || getInput(Options.SystemId)) {
        try {
            const branch = getBranchName();
            if (branch) {
                const owner = context.repo.owner;
                const repo = context.repo.repo;
                const workflowId = await getCurrentWorkflowId(owner, repo, context.workflow);
                await downloadLatestArtifact(workingDirectory, owner, repo, branch, workflowId, getInput(Options.ArtifactName), workingDirectory.outputFile);
            } else {
                info('Caching is disabled for workflows triggered by tag events');
            }
        } catch (err) {
            warning(
                'Could not fetch the ZIP file generated in the last run. ' +
                    'PackSquash will thus not be able to reuse it to speed up processing. ' +
                    'This is a normal occurrence when running a workflow for the first time, or after a long time since its last execution. ' +
                    `(${err})`
            );
        }
    }
    endGroup();
    return restoredCacheKey;
}

export async function savePackSquashCache(workingDirectory: WorkingDirectory, key: string) {
    startGroup('Caching data for future runs');
    await saveCache([workingDirectory.systemIdFile], key);
    endGroup();
}
