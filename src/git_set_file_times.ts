import { getExecOutput } from '@actions/exec';
import { utimes } from 'fs/promises';
import { ensureRepositoryIsNotShallow, getSubmodules, isPathWithin } from './util';
import { debug } from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';

// Some interesting reads about the topic:
// https://stackoverflow.com/questions/56235287/what-does-git-ls-files-do-exactly-and-how-do-we-remove-a-file-from-it
// https://github.com/MestreLion/git-tools/blob/main/git-restore-mtime
// https://git-scm.com/docs/git-log
// https://git-scm.com/docs/git-ls-files

async function setPackFilesModificationTimesFromCommits(workspace: string, packDirectory: string) {
    // Absolutize the paths to avoid classes of problems related to relative paths
    workspace = path.resolve(workspace);
    packDirectory = path.resolve(packDirectory);

    debug(`Setting file modification times according to commit history for ${packDirectory} at ${workspace}`);

    const submodules = await getSubmodules(workspace);
    debug(`Detected submodules: ${submodules.length > 0 ? submodules : 'none'}`);

    const repositoryPaths = [];
    for (const candidateRepositoryPath of [workspace, ...submodules]) {
        // Ignore repositories that do not contribute to the pack directory.
        // A repository contributes to a pack when either the pack directory is within the
        // repository, or the repository is within the pack. Examples:
        // - A repository at /a/b is irrelevant for a pack at /a/c: /a/c is not within /a/b,
        //   and /a/b is not within /a/c
        // - A repository at /a/c/d is relevant for a pack at /a/c: /a/c/d is within /a/c
        // - A repository at /a is relevant for a pack at /a/c: /a/c is within /a (note that
        //   the actual pack files may be provided by a submodule within that repository, but
        //   we will just do benign, useless work in that case)
        const isRelevant = isPathWithin(packDirectory, candidateRepositoryPath) || isPathWithin(candidateRepositoryPath, packDirectory);

        // If this repository is relevant, it must be non-shallow for us to be able to access the
        // full commit history, and we can accumulate it to the repository list
        if (isRelevant) {
            await ensureRepositoryIsNotShallow(candidateRepositoryPath);
            repositoryPaths.push(candidateRepositoryPath);
        }
    }
    debug(`Relevant repositories: ${repositoryPaths.length > 0 ? repositoryPaths : 'none'}`);

    for (const repositoryPath of repositoryPaths) {
        // It's only worth to set modification times of pack files that belong to the Git index.
        // If a pack file does not belong to the index, it can't have previous commit information.
        // The index may contain files that no longer exist or were modified in the working tree by
        // previous workflow steps. Both of these cases are handled in the called function
        const indexedPackFiles = new Set(await getIndexedPackFiles(repositoryPath, packDirectory));
        debug(`Indexed pack files for ${repositoryPath}: ${indexedPackFiles.size}`);

        await setPackFilesModificationTime(repositoryPath, indexedPackFiles);
    }
}

async function getIndexedPackFiles(repository: string, packDirectory: string) {
    // Note that we shouldn't pass the pack directory to ls-files because it may
    // match the submodule directory, and in that case we won't get useful output.
    // There may be other gotchas too, but doing extra checks later does not impact
    // performance much anyway
    const gitOut = await getExecOutput('git', ['-C', repository, 'ls-files', '-z'], {
        silent: true
    });

    return gitOut.stdout.split('\0').flatMap(filePath => {
        // Ignore empty file paths due to a possible trailing NUL char
        if (!filePath) {
            return [];
        }

        filePath = path.join(repository, filePath);

        try {
            // Ignore files that were modified after they were created, as a best effort to handle
            // files modified after cloning (i.e., being created) by previous steps.
            // The isPathWithin check is necessary because, even though some file in this repository
            // is guaranteed to be in the pack directory, not every file is. For example, we might
            // be a repository at /a, while the pack is at /a/b, so only files within /a/b matter
            const fileMeta = fs.statSync(filePath); // Sync because async + flatMap gets messy
            const wasFileNotModifiedInWorkflow = fileMeta.mtimeMs <= fileMeta.birthtimeMs;

            if ('PACKSQUASH_ACTION_EXTRA_VERBOSE_FILE_TIMES_LOGGING' in process.env && !wasFileNotModifiedInWorkflow) {
                debug(`${filePath} was modified in this workflow run: ${fileMeta.mtimeMs} > ${fileMeta.birthtimeMs}`);
            }

            return isPathWithin(filePath, packDirectory) && wasFileNotModifiedInWorkflow ? [filePath] : [];
        } catch {
            // Ignore this file, it can be considered to not exist in the working tree
            return [];
        }
    });
}

async function setPackFilesModificationTime(repository: string, remainingPackFiles: Set<string>) {
    // Handle empty pack file set case promptly: there is nothing to do
    if (remainingPackFiles.size == 0) {
        return;
    }

    // git log --diff-merges=cc --name-only --pretty=format:%ct -z log entry format:
    // <timestamp>(\n(<file>\0)*)?\0{1,2}
    // => consecutive matches of (?<commitTime>\d+)(?:\n(?<modifiedFiles>(?:[^\0]+\0)+)?)?\0{1,2}
    // Not every commit has a diff, and we should handle that:
    // - Empty commits print a single NUL after their timestamp: they do not show any diff.
    // - Merge commits that didn't change anything print a NUL to separate the timestamp from their empty diff,
    //   and then another NUL to end that diff.
    // Due to --name-only, the diff consists on the file names that were changed by the commit.
    // Note that the output format is almost the same as when not using -z, the only difference being that
    // NUL is used instead of newline for separating most fields, barring the commit diff start
    const gitOut = await getExecOutput('git', ['-C', repository, 'log', '--diff-merges=cc', '--name-only', '--pretty=format:%ct', '-z'], {
        silent: true
    });

    // Append a trailing NUL to not ignore the last log entry
    const gitLog = gitOut.stdout + '\0';

    const logEntryRegex = /(?<commitTime>\d+)(?:\n(?<modifiedFiles>(?:[^\0]+\0)+)?)?\0{1,2}/gy;

    let logEntryMatch;
    while ((logEntryMatch = logEntryRegex.exec(gitLog)) != null) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const commitTime = logEntryMatch.groups!.commitTime;
        // The modified files group matches a string like "a\0b\0", which is NUL terminated,
        // so split will return an empty string in the end. Ignore it
        const modifiedFiles = logEntryMatch.groups?.modifiedFiles?.split('\0').slice(0, -1);

        for (let modifiedFile of modifiedFiles || []) {
            modifiedFile = path.join(repository, modifiedFile);

            // Make sure we only change the modification time once for the expected
            // files, and only take into account the latest commit that modified them
            if (remainingPackFiles.delete(modifiedFile)) {
                if ('PACKSQUASH_ACTION_EXTRA_VERBOSE_FILE_TIMES_LOGGING' in process.env) {
                    debug(`Setting ${modifiedFile} modification time to ${new Date(parseInt(commitTime) * 1000)}`);
                }
                await utimes(modifiedFile, commitTime, commitTime);
            }

            // There are no more files to set the date of: stop parsing the log.
            // This can be a substantial speedup for repositories with lots of commits
            if (remainingPackFiles.size == 0) {
                return;
            }
        }
    }
}

export default setPackFilesModificationTimesFromCommits;
