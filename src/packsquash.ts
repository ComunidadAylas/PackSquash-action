import { debug, endGroup, getBooleanInput, getInput, setSecret, startGroup } from '@actions/core';
import { exec } from '@actions/exec';
import { readFile, writeFile } from 'fs/promises';
import { addProblemMatcher, removeProblemMatcher } from './problem_matcher';
import { Options } from './options';
import * as uuid from 'uuid';
import WorkingDirectory from './working_directory';

/// GitHub Actions runners run JavaScript actions directly on the host. For GitHub-hosted
/// runners, this means that they run on a virtual machine, where mounting the AppImage
/// filesystem with FUSE is not a problem. However, when running the action locally with
/// act, a Docker container is used instead by default
const skipAppImageFilesystemMount: Record<string, string> = 'ACT' in process.env ? { APPIMAGE_EXTRACT_AND_RUN: '1' } : {};

export async function printPackSquashVersion(workingDirectory: WorkingDirectory) {
    startGroup('PackSquash version');
    await exec(workingDirectory.packsquashBinary, ['--version'], {
        env: {
            ...{
                PACKSQUASH_EMOJI: showEmojiInPacksquashLogs(),
                PACKSQUASH_COLOR: enableColorInPacksquashLogs()
            },
            ...skipAppImageFilesystemMount
        }
    });
    endGroup();
}

export async function runPackSquash(workingDirectory: WorkingDirectory) {
    const systemId = await getSystemId(workingDirectory);
    debug(`Using system ID: ${systemId}`);
    setSecret(systemId);

    await addProblemMatcher(workingDirectory.problemMatcherFile);

    startGroup('PackSquash output');
    const exitCode = await exec(workingDirectory.packsquashBinary, [workingDirectory.optionsFile], {
        env: {
            ...{
                PACKSQUASH_SYSTEM_ID: systemId,
                PACKSQUASH_EMOJI: showEmojiInPacksquashLogs(),
                PACKSQUASH_COLOR: enableColorInPacksquashLogs()
            },
            ...skipAppImageFilesystemMount
        }
    });
    endGroup();

    removeProblemMatcher(workingDirectory.problemMatcherFile);

    switch (exitCode) {
        case 0:
            // Success
            break;
        default:
            // Any other PackSquash error
            throw new Error(`PackSquash finished with an error code: ${exitCode}`);
    }
}

function showEmojiInPacksquashLogs() {
    return getBooleanInput(Options.ShowEmojiInPacksquashLogs) ? 'show' : '';
}

function enableColorInPacksquashLogs() {
    return getBooleanInput(Options.EnableColorInPacksquashLogs) ? 'show' : '';
}

export async function getSystemId(workingDirectory: WorkingDirectory) {
    const inputSystemId = getInput(Options.SystemId);
    if (inputSystemId) {
        await writeFile(workingDirectory.systemIdFile, inputSystemId, 'utf8');
        return inputSystemId;
    }

    let cachedOrGeneratedSystemId;
    try {
        // Try with any cached system ID we may have first, to reuse results
        // from previous runs
        cachedOrGeneratedSystemId = await readFile(workingDirectory.systemIdFile, 'utf8');
        if (!cachedOrGeneratedSystemId) {
            throw Error('Invalid cached system ID');
        }
    } catch (error) {
        // We don't have a cached system ID, it is invalid or an I/O error
        // happened. Generate a new random one
        cachedOrGeneratedSystemId = uuid.v4();
        await writeFile(workingDirectory.systemIdFile, cachedOrGeneratedSystemId, 'utf8');
    }

    return cachedOrGeneratedSystemId;
}
