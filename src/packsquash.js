import { endGroup, exportVariable, getBooleanInput, startGroup, warning } from '@actions/core';
import { exec } from '@actions/exec';
import { rmSync } from 'fs';
import { addProblemMatcher, removeProblemMatcher } from './problem-matcher';
import { Options } from './options';

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function printPackSquashVersion(workingDirectory) {
    startGroup('PackSquash version');
    await exec(workingDirectory.packsquashBinary, ['--version']);
    endGroup();
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function runPackSquash(workingDirectory) {
    async function run(description) {
        addProblemMatcher(workingDirectory.problemMatcherFile);
        if (description) {
            startGroup(`PackSquash output (${description})`);
        } else {
            startGroup('PackSquash output');
        }
        const exitCode = await exec(workingDirectory.packsquashBinary, [workingDirectory.optionsFile]);
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
            rmSync(workingDirectory.outputFile);
            exitCode = await run('discarded previous ZIP file');
            if (exitCode !== 0) {
                process.exit(exitCode);
            }
            break;
        default:
            // Any other PackSquash error
            process.exit(exitCode);
    }
}

/**
 * Set PackSquash emoji and color environment variables
 */
export function setPackSquashLogsVariables() {
    exportVariable('PACKSQUASH_EMOJI', getBooleanInput(Options.ShowEmojiInPacksquashLogs) ? 'show' : null);
    exportVariable('PACKSQUASH_COLOR', getBooleanInput(Options.EnableColorInPacksquashLogs) ? 'show' : null);
}
