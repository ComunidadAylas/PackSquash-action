import { getExecOutput } from '@actions/exec';
import { debug } from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import * as stream from 'stream';

/**
 * If caching may be used, and setGitFileModificationTimes should be executed,
 * we need to check that the repo is not shallow, because if it is we will be
 * missing the time data needed for proper caching operation.
 *
 * @returns A rejected promise if the check fails.
 */
export async function checkRepositoryIsNotShallow() {
    const workspace = getEnvOrThrow('GITHUB_WORKSPACE');

    debug(`Checking that the repository checkout at ${workspace} is not shallow`);

    let output;
    try {
        output = await getExecOutput('git', ['-C', workspace, 'rev-parse', '--is-shallow-repository'], {
            silent: true
        });
    } catch (error) {
        throw Error(
            `Could not check whether the repository is shallow: ${error}. Has the repository been checked out? If you don't want it, the never_store_squash_times actions parameter must be set to true.`
        );
    }

    if (output.stdout === 'true\n') {
        throw Error('The full commit history of the repository must be checked out. Please set the fetch-depth parameter of actions/checkout to 0.');
    }
}

export function getArchitecture() {
    return getEnvOrThrow('RUNNER_ARCH');
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
 * @return The branch name, or `null` if the triggering ref is a tag.
 */
export function getBranchName() {
    if (process.env.GITHUB_REF_TYPE === 'branch') {
        const head_ref = process.env.GITHUB_HEAD_REF;
        if (head_ref) {
            return head_ref;
        }
        return process.env.GITHUB_REF_NAME as string;
    } else {
        return null;
    }
}

export async function downloadFile(url: string, path: string) {
    const client = new HttpClient();
    const writeStream = createWriteStream(path);
    const response = await client.get(url);
    const pipeline = promisify(stream.pipeline);
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
