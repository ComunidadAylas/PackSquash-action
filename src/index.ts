import { debug, getInput, info, setFailed } from '@actions/core';
import { generateOptionsFile, getPackDirectory, Options, printOptionsFileContent, mayCacheBeUsed, tweakAndCopyUserOptionsFile } from './options.js';
import { computeCacheKey, restorePackSquashCache, savePackSquashCache } from './cache';
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

    const optionsFile = getInput(Options.OptionsFile);
    const workspace = getEnvOrThrow('GITHUB_WORKSPACE');

    if (optionsFile) {
        info(`Using custom options file: the ${Options.OptionsFile} action parameter is set`);
        await tweakAndCopyUserOptionsFile(optionsFile, workingDirectory);
    } else {
        await generateOptionsFile(workingDirectory);
    }
    await printOptionsFileContent(workingDirectory);

    const packDirectory = getPackDirectory();
    const cacheMayBeUsed = mayCacheBeUsed();

    await downloadAppImage(workingDirectory);
    await printPackSquashVersion(workingDirectory);

    const [key, ...restoreKeys] = await computeCacheKey(workingDirectory);
    let restoredCacheKey;
    if (cacheMayBeUsed) {
        restoredCacheKey = await restorePackSquashCache(workingDirectory, key, restoreKeys);
        await setPackFilesModificationTimesFromCommits(workspace, packDirectory);
    }

    await runPackSquash(workingDirectory);

    await uploadArtifact(workingDirectory);

    if (cacheMayBeUsed && !restoredCacheKey) {
        await savePackSquashCache(workingDirectory, key);
    }
}

run().catch(err => {
    setFailed(err instanceof Error ? err.stack || err.message : err);
});
