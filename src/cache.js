import { endGroup, exportVariable, getInput, getState, saveState, startGroup } from '@actions/core';
import { restoreCache, saveCache } from '@actions/cache';
import { hashFiles } from '@actions/glob';
import { context } from '@actions/github';
import { downloadLatestArtifact, getCurrentWorkflowId } from './workflow';
import { Options } from './options';
import working_directory from './working_directory';

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
        await downloadLatestArtifact(workingDirectory);
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
