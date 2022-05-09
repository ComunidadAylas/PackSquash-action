import { getExecOutput } from '@actions/exec';
import { debug, setFailed } from '@actions/core';

/**
 * If caching may be used (more precisely, the git-set-file-times.pl script would be executed), check that the repo is not a shallow one, because if it is we will be missing time data
 * @returns {Promise<void>}
 */
export async function checkRepositoryIsNotShallow() {
    const workspace = getEnvOrThrow('GITHUB_WORKSPACE');
    debug(`Checking that the repository checkout at ${workspace} is not shallow`);
    const output = await getExecOutput('git', ['-C', workspace, 'rev-parse', '--is-shallow-repository'], {
        silent: true
    });
    if (output.stdout === 'true\n') {
        setFailed('The full commit history of the repository must be checked out. Please set the fetch-depth parameter of actions/checkout to 0.');
    }
}

/**
 * @returns {string}
 */
export function getArchitecture() {
    return getEnvOrThrow('RUNNER_ARCH');
}

/**
 * Returns the value of the specified environment variable. If it was not
 * defined an exception will be thrown.
 * @param {string} variable The environment variable to get the value of.
 * @returns {string} The value of the environment variable.
 */
function getEnvOrThrow(variable) {
    if (variable in process.env) {
        return process.env[variable];
    } else {
        throw new Error(`Internal error: the ${variable} environment variable is missing`);
    }
}
