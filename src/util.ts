import { getExecOutput } from '@actions/exec';
import { debug } from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import * as stream from 'stream';
import * as path from 'path';
import crypto from 'crypto';

const pipeline = promisify(stream.pipeline);

/**
 * If caching may be used, and setGitFileModificationTimes should be executed,
 * we need to check that the repo is not shallow, because if it is we will be
 * missing the time data needed for proper caching operation.
 *
 * @returns A rejected promise if the check fails.
 */
export async function ensureRepositoryIsNotShallow(workspace: string) {
    debug(`Checking that the repository checkout at ${workspace} is not shallow`);

    const gitOut = await getExecOutput('git', ['-C', workspace, 'rev-parse', '--is-shallow-repository'], {
        silent: true
    });

    if (gitOut.stdout === 'true\n') {
        throw Error('The full commit history must be checked out. Please set the fetch-depth parameter of actions/checkout to 0.');
    }
}

/**
 * Returns the absolute paths of the submodules that belong to the given workspace.
 * Submodules within submodules will also be returned. Non-initialized submodules
 * will not be returned.
 *
 * @param workspace The workspace to get its submodules of.
 */
export async function getSubmodules(workspace: string): Promise<string[]> {
    try {
        const gitOut = await getExecOutput('git', ['-C', workspace, 'submodule', 'foreach', '--recursive', '--quiet', 'echo "$displaypath"'], {
            silent: true
        });

        return gitOut.stdout.split('\n').flatMap(submodulePath => (submodulePath ? [path.join(workspace, submodulePath)] : []));
    } catch (error) {
        throw Error(
            `Could not get information about the repository: ${error}. Has the repository been checked out? ` +
                `If you don't want to check it out, disable caching by setting the never_store_squash_times option to true.`
        );
    }
}

/**
 * - **GITHUB_REF_TYPE**
 *   The type of ref that triggered the workflow run. Valid values are branch or tag.
 * - **GITHUB_HEAD_REF**:
 *   The head ref or source branch of the pull request in a workflow run.
 *   This property is only set when the event that triggers a workflow run is either pull_request or pull_request_target.
 *   For example, feature-branch-1.
 * - **GITHUB_REF_NAME**:
 *   The branch or tag name that triggered the workflow run. For example, feature-branch-1.
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
 * @see https://github.com/ComunidadAylas/PackSquash-action/pull/17#discussion_r868154905
 * @return The branch name, or `undefined` if the triggering ref is a tag.
 */
export function getBranchName() {
    if (process.env.GITHUB_REF_TYPE !== 'branch') {
        return undefined;
    }

    const headRef = process.env.GITHUB_HEAD_REF;
    return headRef ? headRef : process.env.GITHUB_REF_NAME;
}

export async function downloadFile(url: string, path: string) {
    const client = new HttpClient();
    const writeStream = createWriteStream(path);
    const response = await client.get(url);
    await pipeline(response.message, writeStream);
}

/**
 * Returns the value of the specified environment variable. If it was not
 * defined an exception will be thrown.
 * @param variable The environment variable to get the value of.
 * @returns The value of the environment variable.
 */
export function getEnvOrThrow(variable: string) {
    if (variable in process.env) {
        return process.env[variable] as string;
    } else {
        throw new Error(`Internal error: the ${variable} environment variable is missing`);
    }
}

/**
 * Checks whether a descendant path is contained within a parent path. A descendant
 * path equal to a parent path is considered to be within that parent path.
 *
 * Both paths are assumed to be absolute.
 *
 * @param descendant The path to check whether it is within `parent`.
 * @param parent The path to which `descendant` should belong to.
 */
// Function adapted from https://github.com/domenic/path-is-inside/blob/05a9bf7c5e008505539e14e96c4d2fc8b2c6d058/lib/path-is-inside.js
export function isPathWithin(descendant: string, parent: string) {
    function stripTrailingPathSep(subject: string) {
        return subject.endsWith(path.sep) ? subject.slice(0, -1) : subject;
    }

    // For inside-directory checking, we want to allow trailing slashes, so normalize
    descendant = stripTrailingPathSep(descendant);
    parent = stripTrailingPathSep(parent);

    // Node treats only Windows as case-insensitive in its path module. We follow those conventions
    if (process.platform === 'win32') {
        descendant = descendant.toLowerCase();
        parent = parent.toLowerCase();
    }

    return descendant.lastIndexOf(parent, 0) == 0 && (descendant[parent.length] === path.sep || descendant[parent.length] === undefined);
}

export async function md5Hash(data: string) {
    const hasher = crypto.createHash('md5');

    return hasher.update(data).digest().toString('hex');
}
