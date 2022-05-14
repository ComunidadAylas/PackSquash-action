import { debug, endGroup, getBooleanInput, getInput, setSecret, startGroup, warning } from '@actions/core';
import { exec } from '@actions/exec';
import { readFile, rm, writeFile } from 'fs/promises';
import { addProblemMatcher, removeProblemMatcher } from './problem_matcher';
import { Options } from './options';
import * as uuid from 'uuid';

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function printPackSquashVersion(workingDirectory) {
    startGroup('PackSquash version');
    await exec(workingDirectory.packsquashBinary, ['--version'], {
        env: {
            PACKSQUASH_EMOJI: showEmojiInPacksquashLogs(),
            PACKSQUASH_COLOR: enableColorInPacksquashLogs()
        }
    });
    endGroup();
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function runPackSquash(workingDirectory) {
    const systemId = await getSystemId(workingDirectory);
    debug(`Using system ID: ${systemId}`);
    setSecret(systemId);

    async function run(description) {
        await addProblemMatcher(workingDirectory.problemMatcherFile);
        if (description) {
            startGroup(`PackSquash output (${description})`);
        } else {
            startGroup('PackSquash output');
        }
        const exitCode = await exec(workingDirectory.packsquashBinary, [workingDirectory.optionsFile], {
            env: {
                PACKSQUASH_SYSTEM_ID: systemId,
                PACKSQUASH_EMOJI: showEmojiInPacksquashLogs(),
                PACKSQUASH_COLOR: enableColorInPacksquashLogs()
            }
        });
        endGroup();
        removeProblemMatcher(workingDirectory.problemMatcherFile);
        return exitCode;
    }

    let exitCode = await run();
    switch (exitCode) {
        case 0:
            // Success
            break;
        case 129:
            // Actionable error code returned by v0.3.0 only
            warning('PackSquash reported that the previous ZIP file could not be used to speed up processing. Discarding it.');
            await rm(workingDirectory.outputFile);
            exitCode = await run('discarded previous ZIP file');
            if (exitCode !== 0) {
                throw new Error(`PackSquash finished with an error code: ${exitCode}`);
            }
            break;
        default:
            // Any other PackSquash error
            throw new Error(`PackSquash finished with an error code: ${exitCode}`);
    }
}

/**
 * @returns {string|null}
 */
function showEmojiInPacksquashLogs() {
    return getBooleanInput(Options.ShowEmojiInPacksquashLogs) ? 'show' : null;
}

/**
 * @returns {string|null}
 */
function enableColorInPacksquashLogs() {
    return getBooleanInput(Options.EnableColorInPacksquashLogs) ? 'show' : null;
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<string>}
 */
export async function getSystemId(workingDirectory) {
    const inputSystemId = getInput(Options.SystemId);
    if (inputSystemId) {
        return inputSystemId;
    }

    let cachedOrGeneratedSystemId;
    try {
        // Try with any cached system ID we may have first, to reuse results
        // from previous runs
        cachedOrGeneratedSystemId = await readFile(workingDirectory.systemIdFile, { encoding: 'utf8' });
        if (!cachedOrGeneratedSystemId) {
            throw Error('Invalid cached system ID');
        }
    } catch (error) {
        // We don't have a cached system ID, it is invalid or an I/O error
        // happened. Generate a new random one
        cachedOrGeneratedSystemId = uuid.v4();
        await writeFile(workingDirectory.systemIdFile, cachedOrGeneratedSystemId, { encoding: 'utf8' });
    }

    return cachedOrGeneratedSystemId;
}
