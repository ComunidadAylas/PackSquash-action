import { endGroup, getInput, startGroup, warning } from '@actions/core';
import { restoreCache, saveCache } from '@actions/cache';
import { hashFiles } from '@actions/glob';
import { context } from '@actions/github';
import { downloadLatestArtifact, getCurrentWorkflowId } from './workflow';
import { Options } from './options';

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<string[]>}
 */
export async function computeCacheKey(workingDirectory) {
    const hash = await hashFiles(workingDirectory.options);
    const key0 = `packsquash-0-${getInput(Options.ActionCacheRevision)}-${getInput(Options.PackSquashVersion)}-${hash}`;
    const key1 = `${key0}-${context.runId}-${context.job}`;
    return [key1, key0];
}

/**
 * Restore the pack ZIP from the previous artifact and ./system_id from the cache if needed, and if this workflow has been run at least once
 * @param {WorkingDirectory} workingDirectory
 * @param {string} key
 * @param {string[]} restore_keys
 * @returns {Promise<string>}
 */
export async function restorePackSquashCache(workingDirectory, key, restore_keys) {
    startGroup('Restoring cached data');
    const restoredCacheKey = await restoreCache([workingDirectory.systemId], key, restore_keys);
    if (restoredCacheKey || getInput(Options.SystemId)) {
        try {
            const owner = context.repo.owner;
            const repo = context.repo.repo;
            const branch = context.ref.split('/')[2];
            const workflowId = await getCurrentWorkflowId(owner, repo, context.workflow);
            const isError = await downloadLatestArtifact(workingDirectory, owner, repo, branch, workflowId, getInput(Options.ArtifactName));
            if (isError) {
                warning(
                    'Could not fetch the ZIP file generated in the last run. PackSquash will thus not be able to reuse it to speed up processing. This is a normal occurrence when running a workflow for the first time, or after a long time since its last execution.'
                );
            }
        } catch (err) {
            warning(`Could not fetch the ZIP file generated in the last run. (${err})`);
        }
    }
    endGroup();
    return restoredCacheKey;
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function savePackSquashCache(workingDirectory, key) {
    startGroup('Caching data for future runs');
    await saveCache([workingDirectory.systemId], key);
    endGroup();
}
