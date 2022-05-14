import { getInput, setFailed } from '@actions/core';
import { generateOptionsFile, Options, printOptionsFileContent, shouldUseCache } from './options.js';
import { computeCacheKey, restorePackSquashCache, savePackSquashCache } from './cache';
import { downloadAppImage } from './appimage';
import { printPackSquashVersion, runPackSquash } from './packsquash';
import { uploadArtifact } from './workflow';
import setGitFileModificationTimes from './git_set_file_times';
import { checkRepositoryIsNotShallow } from './util';
import { copyFile } from 'fs/promises';
import WorkingDirectory from './working_directory';

async function run() {
    const workingDirectory = new WorkingDirectory();
    await workingDirectory.rm();
    await workingDirectory.mkdir();
    let optionsFile = getInput(Options.OptionsFile);
    const useCache = optionsFile || shouldUseCache();
    if (useCache) {
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
    let restoreCache;
    if (useCache) {
        restoreCache = await restorePackSquashCache(workingDirectory, key, restoreKeys);
    }
    if (useCache) {
        await setGitFileModificationTimes();
    }
    await runPackSquash(workingDirectory);
    await uploadArtifact(workingDirectory);
    if (useCache && !restoreCache) {
        await savePackSquashCache(workingDirectory, key);
    }
}

run().catch(err => setFailed(err));
