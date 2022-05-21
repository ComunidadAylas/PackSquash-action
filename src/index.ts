import { getInput, setFailed } from '@actions/core';
import { generateOptionsFile, Options, printOptionsFileContent, shouldUseCache } from './options.js';
import { computeCacheKey, restorePackSquashCache, savePackSquashCache } from './cache';
import { downloadAppImage } from './appimage';
import { printPackSquashVersion, runPackSquash } from './packsquash';
import { uploadArtifact } from './workflow';
import setGitFileModificationTimes from './git_set_file_times';
import { checkRepositoryIsNotShallow, getEnvOrThrow } from './util';
import { copyFile } from 'fs/promises';
import WorkingDirectory from './working_directory';

async function run() {
    const runnerOs = getEnvOrThrow('RUNNER_OS');
    if (runnerOs !== 'Linux') {
        throw Error(`Unsupported runner OS: only Linux is supported at the moment, but the job is running on ${runnerOs}. Please switch to a Linux-based runner.`);
    }

    const workingDirectory = new WorkingDirectory();
    await workingDirectory.rm();
    await workingDirectory.mkdir();
    let optionsFile = getInput(Options.OptionsFile);
    const cacheMayBeUsed = optionsFile || shouldUseCache();
    if (cacheMayBeUsed) {
        await checkRepositoryIsNotShallow();
    }
    await downloadAppImage(workingDirectory);
    await printPackSquashVersion(workingDirectory);
    if (optionsFile) {
        await copyFile(optionsFile, workingDirectory.optionsFile);
    } else {
        optionsFile = await generateOptionsFile(workingDirectory);
    }
    await printOptionsFileContent(optionsFile);
    const [key, ...restoreKeys] = await computeCacheKey(workingDirectory);
    let restoredCacheKey;
    if (cacheMayBeUsed) {
        restoredCacheKey = await restorePackSquashCache(workingDirectory, key, restoreKeys);
    }
    if (cacheMayBeUsed) {
        await setGitFileModificationTimes();
    }
    await runPackSquash(workingDirectory);
    await uploadArtifact(workingDirectory);
    if (cacheMayBeUsed && !restoredCacheKey) {
        await savePackSquashCache(workingDirectory, key);
    }
}

run().catch(err => setFailed(err));
