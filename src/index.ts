import { setFailed } from '@actions/core';
import { PackSquashOptions } from './packsquash_options';
import { computeCacheKeys, restorePackSquashCache, savePackSquashCache } from './cache';
import { downloadAppImage } from './appimage';
import { printPackSquashVersion, runPackSquash } from './packsquash';
import { uploadArtifact } from './workflow';
import setPackFilesModificationTimesFromCommits from './git_set_file_times';
import { getEnvOrThrow } from './util';
import WorkingDirectory from './working_directory';

async function run() {
    const runnerOs = getEnvOrThrow('RUNNER_OS');
    if (runnerOs !== 'Linux') {
        throw Error(`Unsupported runner OS: only Linux is supported at the moment, but the job is running on ${runnerOs}. Please switch to a Linux-based runner.`);
    }

    const workingDirectory = new WorkingDirectory();
    await workingDirectory.rm();
    await workingDirectory.mkdir();

    const packSquashOptions = await PackSquashOptions.parseAndTweak(workingDirectory);
    await packSquashOptions.showAndWriteToWorkingDirectory();

    const packDirectory = packSquashOptions.getPackDirectory();
    if (packDirectory === undefined) {
        // This likely common error would be caught later by PackSquash,
        // but handling it here avoids wasting time
        throw Error(
            'The required pack_directory option is missing from the specified options. ' +
                'Please specify the relative path to the folder containing the pack.mcmeta file of the pack you want to optimize.'
        );
    }

    await downloadAppImage(workingDirectory);
    await printPackSquashVersion(workingDirectory);

    const [key, ...restoreKeys] = await computeCacheKeys(workingDirectory);
    let cacheRestored = false;
    if (packSquashOptions.mayCacheBeUsed()) {
        cacheRestored = await restorePackSquashCache(workingDirectory, key, restoreKeys);
        await setPackFilesModificationTimesFromCommits(getEnvOrThrow('GITHUB_WORKSPACE'), packDirectory);
    }

    await runPackSquash(workingDirectory);

    await uploadArtifact(workingDirectory);

    if (packSquashOptions.mayCacheBeUsed() && !cacheRestored) {
        await savePackSquashCache(workingDirectory, key);
    }
}

run().catch(err => setFailed(err instanceof Error ? err.message : err));
