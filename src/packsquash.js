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
            break;
        case 129:
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
export function getSystemId(workingDirectory) {
    const inputSystemId = getInput(Options.SystemId);
    if (inputSystemId) {
        return new Promise(resolve => {
            resolve(inputSystemId);
        });
    }
    return readFile(workingDirectory.systemIdFile, { encoding: 'utf8' })
        .then(async cachedSystemId => {
            if (cachedSystemId) {
                return cachedSystemId;
            }
            throw Error();
        })
        .catch(async () => {
            const systemId = uuid.v4();
            await writeFile(workingDirectory.systemIdFile, systemId, { encoding: 'utf8' });
            return systemId;
        });
}
