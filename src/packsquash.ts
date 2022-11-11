import { debug, endGroup, setSecret, startGroup } from '@actions/core';
import { exec } from '@actions/exec';
import { readFile, writeFile } from 'fs/promises';
import { addProblemMatcher, removeProblemMatcher } from './problem_matcher';
import * as uuid from 'uuid';
import WorkingDirectory from './working_directory';
import { getInputValue } from './action_input';
import { PackSquashOptions } from './packsquash_options';

const prettyOutputEnvironment = {
    PACKSQUASH_EMOJI: getInputValue('show_emoji_in_packsquash_logs') ? 'show' : '',
    PACKSQUASH_COLOR: getInputValue('enable_color_in_packsquash_logs') ? 'show' : ''
};

/// GitHub Actions runners run JavaScript actions directly on the host. For GitHub-hosted
/// runners, this means that they run on a virtual machine, where mounting the AppImage
/// filesystem with FUSE is not a problem. However, when running the action locally with
/// act, a Docker container is used instead by default. Moreover, the AppImage runtime
/// depends on libfuse2, which is no longer included with GitHub Ubuntu 22 images.
/// Therefore, play it safe and always extract the image, which does not require FUSE to
/// be available
const appImageMountEnvironment: Record<string, string> = { APPIMAGE_EXTRACT_AND_RUN: '1' };

export async function printPackSquashVersion(workingDirectory: WorkingDirectory) {
    startGroup('PackSquash version');
    await exec(workingDirectory.packsquashBinary, ['--version'], {
        env: {
            ...prettyOutputEnvironment,
            ...appImageMountEnvironment
        }
    });
    endGroup();
}

export async function runPackSquash(packSquashOptions: PackSquashOptions, workingDirectory: WorkingDirectory) {
    const systemId = await getSystemId(workingDirectory);
    debug(`Using system ID: ${systemId}`);
    setSecret(systemId);

    await addProblemMatcher(workingDirectory.problemMatcherFile);

    startGroup('PackSquash output');
    const exitCode = await exec(workingDirectory.packsquashBinary, [], {
        input: Buffer.from(packSquashOptions.stringifiedOptions),
        env: {
            PACKSQUASH_SYSTEM_ID: systemId,
            ...prettyOutputEnvironment,
            ...appImageMountEnvironment
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

async function getSystemId(workingDirectory: WorkingDirectory) {
    const inputSystemId = getInputValue('system_id');
    if (inputSystemId) {
        await writeFile(workingDirectory.systemIdFile, inputSystemId, 'utf8');
        return inputSystemId;
    }

    let cachedOrGeneratedSystemId;
    try {
        // Try with any cached system ID we may have first, to reuse results
        // from previous runs
        cachedOrGeneratedSystemId = await readFile(workingDirectory.systemIdFile, 'utf8');
    } catch {
        // We don't have a cached system ID or an I/O error happened.
        // Generate a new random one
        cachedOrGeneratedSystemId = uuid.v4();
        await writeFile(workingDirectory.systemIdFile, cachedOrGeneratedSystemId, 'utf8');
    }

    return cachedOrGeneratedSystemId;
}
