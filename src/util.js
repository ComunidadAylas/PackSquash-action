import { getExecOutput } from '@actions/exec';
import { getWorkSpaceDirectory } from '@actions/artifact/lib/internal/config-variables';
import { debug, setFailed } from '@actions/core';

/**
 * If caching may be used (more precisely, the git-set-file-times.pl script would be executed), check that the repo is not a shallow one, because if it is we will be missing time data
 * @returns {Promise<void>}
 */
export async function checkRepositoryIsNotShallow() {
    const workspace = getWorkSpaceDirectory();
    debug(`Checking that the repository checkout at ${workspace} is not shallow`);
    const output = await getExecOutput('git', ['-C', workspace, 'rev-parse', '--is-shallow-repository'], {
        silent: true
    });
    if (output.stdout === 'true\n') {
        setFailed('The full commit history of the repository must be checked out. Please set the fetch-depth parameter of actions/checkout to 0.');
    }
}

/**
 * @returns {Promise<string>}
 */
export async function getArchitecture() {
    const output = await getExecOutput('uname', ['-m'], { silent: true });
    return output.stdout.split('\n')[0];
}
