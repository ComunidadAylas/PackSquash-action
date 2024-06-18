import { getExecOutput } from '@actions/exec';
import { utimes, stat } from 'fs/promises';
import { ensureRepositoryIsNotShallow, getSubmodules, isPathWithin } from './util';
import { debug, warning } from '@actions/core';
import * as path from 'path';

// Some interesting reads about the topic:
// https://stackoverflow.com/questions/56235287/what-does-git-ls-files-do-exactly-and-how-do-we-remove-a-file-from-it
// https://github.com/MestreLion/git-tools/blob/main/git-restore-mtime
// https://git-scm.com/docs/git-log
// https://git-scm.com/docs/git-ls-files

const VERBOSE_LOGGING_ENV_VAR = 'PACKSQUASH_ACTION_EXTRA_VERBOSE_FILE_TIMES_LOGGING';

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
        // However, the index may contain files that no longer exist or were modified in the working
        // tree by previous workflow steps. Both of these cases are handled in the called function
        const indexedPackFiles = new Set(await getUnmodifiedIndexedPackFiles(repositoryPath, packDirectory));
        debug(`Indexed pack files for ${repositoryPath}: ${indexedPackFiles.size}`);

        await setPackFilesModificationTime(repositoryPath, indexedPackFiles);
    }
}

async function getUnmodifiedIndexedPackFiles(repository: string, packDirectory: string) {
    // Note that we shouldn't pass the pack directory to ls-files because it may
    // match the submodule directory, and in that case we won't get useful output.
    // There may be other gotchas too, but doing extra checks later does not impact
    // performance much anyway
    const gitOut = await getExecOutput('git', ['-C', repository, 'ls-files', '-s', '-z'], {
        silent: true
    });

    return (
        await Promise.all(
            gitOut.stdout
                .split('\0')
                .slice(0, -1) // Ignore empty entry due to the trailing NUL char
                .flatMap(async fileInfo => {
                    const fileInfoFields = fileInfo.split('\t', 2);
                    const filePath = path.join(repository, fileInfoFields[1]);
                    const fileIndexData = fileInfoFields[0];

                    // We should ignore files that were modified by the workflow run, as the repository history
                    // is no longer representative of when they were last modified. To achieve this, do a two-step
                    // check:
                    // 1. Weed out files that were not modified after being created. When cloning, mtime usually
                    //    equals birthtime, but not necessarily (git clone may be running slow enough for timestamp
                    //    differences to be noticeable). This is cheap and saves lots of more expensive hash checks,
                    //    but assumes that the filesystem stores birthtimes, which is the case in GitHub-hosted runners
                    //    and most sane Linux environments.
                    // 2. For the potentially modified files that passed the above check, compute their git object
                    //    hash and compare it with the one stored in the index. If they match, the file is the same;
                    //    else, actual changes were made.
                    // There are several assumptions at play here:
                    // - Only a few files were truly modified (otherwise, it's less work to compare hashes directly)
                    // - People don't modify indexed files by deleting and creating them again (if you do, please file
                    //   an issue and PackSquash will at least make this optimization toggleable, so it can rely on the
                    //   slower hash-only method)
                    let fileMeta;
                    try {
                        fileMeta = await stat(filePath);
                    } catch {
                        // Ignore this file, it can be considered to not exist in the working tree
                        return [];
                    }

                    // ls-files yields directories when the repository has submodules, and perhaps in other cases.
                    // We are not interested in the directories themselves, so ignore this. Note that stat() resolves
                    // symlinks, and throws an error if the symlink target does not exist
                    if (fileMeta.isDirectory()) {
                        return [];
                    }

                    const wasFilePotentiallyModifiedInWorkflow = fileMeta.mtimeMs > fileMeta.birthtimeMs;

                    let wasFileModifiedInWorkflow;
                    if (wasFilePotentiallyModifiedInWorkflow) {
                        const gitOut = await getExecOutput('git', ['-C', repository, 'hash-object', filePath], {
                            silent: true
                        });

                        const actualHash = gitOut.stdout.trimEnd(); // Ignore trailing line break
                        const indexedHash = fileIndexData.split(' ', 3)[1];

                        wasFileModifiedInWorkflow = actualHash != indexedHash;

                        if (VERBOSE_LOGGING_ENV_VAR in process.env && wasFileModifiedInWorkflow) {
                            debug(`${filePath} was modified in this run: ${fileMeta.mtimeMs} > ${fileMeta.birthtimeMs}, ${actualHash} != ${indexedHash}`);
                        }
                    } else {
                        wasFileModifiedInWorkflow = false;
                    }

                    // The isPathWithin check is necessary because, even though some file in this repository
                    // is guaranteed to be in the pack directory, not every file is. For example, we might
                    // be a repository at /a, while the pack is at /a/b, so only files within /a/b matter
                    return isPathWithin(filePath, packDirectory) && !wasFileModifiedInWorkflow ? [filePath] : [];
                })
        )
    ).flat();
}

async function setPackFilesModificationTime(repository: string, remainingPackFiles: Set<string>) {
    // Handle empty pack file set case promptly: there is nothing to do
    if (remainingPackFiles.size == 0) {
        return;
    }

    // git log --diff-merges=cc --name-only --pretty=format:%ct -z log entry format:
    // <timestamp>([\n\0](<file>\0)*)?\0{1,2}
    // => consecutive matches of (?<commitTime>\d+)(?:[\n\0](?<modifiedFiles>(?:[^\0]+\0)+)?)?\0{1,2}
    // Not every commit has a diff, and we should handle that:
    // - Empty commits print a single NUL after their timestamp: they do not show any diff.
    // - Merge commits that didn't change anything print a NUL to separate the timestamp from their empty diff,
    //   and then another NUL to end that diff.
    // Due to --name-only, the diff consists on the file names that were changed by the commit.
    // Note that the output format is almost the same as when not using -z, the only difference being that
    // NUL is used instead of newline for separating most fields, barring the commit diff start. In some strange
    // cases found in the openssl repo, \0 may be used instead of \n for separating the commit diff start anyway
    const gitOut = await getExecOutput('git', ['-C', repository, 'log', '--diff-merges=cc', '--name-only', '--pretty=format:%ct', '-z'], {
        silent: true
    });

    // Append a trailing NUL to not ignore the last log entry
    const gitLog = gitOut.stdout + '\0';

    const logEntryRegex = /(?<commitTime>\d+)(?:[\n\0](?<modifiedFiles>(?:[^\0]+\0)+)?)?\0{1,2}/gy;

    let logEntryMatch;
    let lastLogEntryMatchIndex;
    while ((logEntryMatch = logEntryRegex.exec(gitLog)) != null) {
        const commitTime = logEntryMatch.groups!.commitTime;
        // The modified files group matches a string like "a\0b\0", which is NUL terminated,
        // so split will return an empty string in the end. Ignore it
        const modifiedFiles = logEntryMatch.groups?.modifiedFiles?.split('\0').slice(0, -1);

        for (let modifiedFile of modifiedFiles || []) {
            modifiedFile = path.join(repository, modifiedFile);

            // Make sure we only change the modification time once for the expected
            // files, and only take into account the latest commit that modified them
            if (remainingPackFiles.delete(modifiedFile)) {
                if (VERBOSE_LOGGING_ENV_VAR in process.env) {
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

        lastLogEntryMatchIndex = logEntryRegex.lastIndex;
    }

    // Sanity check: if we didn't bail out due to no more pack files remaining, we should parse all the logs
    if (lastLogEntryMatchIndex !== undefined && lastLogEntryMatchIndex != gitLog.length) {
        warning(
            `Could not parse the entire Git log for the repository at ${repository} (${lastLogEntryMatchIndex}/${gitLog.length} bytes parsed). ` +
                'Caching effectiveness may be degraded. Please report an issue'
        );
    }
}

export default setPackFilesModificationTimesFromCommits;
