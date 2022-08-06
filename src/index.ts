import { getInput, info, setFailed } from '@actions/core';
import { generateOptionsFile, Options, printOptionsFileContent, shouldUseCache, tweakAndCopyUserOptionsFile } from './options.js';
import { computeCacheKey, restorePackSquashCache, savePackSquashCache } from './cache';
import { downloadAppImage } from './appimage';
import { printPackSquashVersion, runPackSquash } from './packsquash';
import { uploadArtifact } from './workflow';
import setGitFileModificationTimes from './git_set_file_times';
import { checkRepositoryIsNotShallow, getEnvOrThrow } from './util';
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
    const packDirectory = getInput(Options.Path);
    const cacheMayBeUsed = optionsFile || shouldUseCache();
    const workspace = getEnvOrThrow('GITHUB_WORKSPACE');
    if (cacheMayBeUsed) {
        await checkRepositoryIsNotShallow(workspace);
    }
    await downloadAppImage(workingDirectory);
    await printPackSquashVersion(workingDirectory);
    if (optionsFile) {
        info(`Using custom options file: the ${Options.OptionsFile} action parameter is set`);
        await tweakAndCopyUserOptionsFile(optionsFile, workingDirectory);
    } else {
        await generateOptionsFile(workingDirectory);
    }
    await printOptionsFileContent(workingDirectory);
    const [key, ...restoreKeys] = await computeCacheKey(workingDirectory);
    let restoredCacheKey;
    if (cacheMayBeUsed) {
        restoredCacheKey = await restorePackSquashCache(workingDirectory, key, restoreKeys);
        await setGitFileModificationTimes(workspace, packDirectory);
    }
    await runPackSquash(workingDirectory);
    await uploadArtifact(workingDirectory);
    if (cacheMayBeUsed && !restoredCacheKey) {
        await savePackSquashCache(workingDirectory, key);
    }
}

run().catch(err => setFailed(err));
