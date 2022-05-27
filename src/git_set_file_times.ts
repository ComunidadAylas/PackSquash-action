import { getExecOutput } from '@actions/exec';
import { utimes } from 'fs/promises';
import * as path from 'path';
import { getSubmodulePaths } from './util';
import { getIntegerInput, Options } from './options';
import { debug, warning } from '@actions/core';

interface Repository {
    name: string;
    workspace: string;
    files: string[];
    directory: string;
}

async function setGitFileModificationTimes(workspace: string, pack_directory: string) {
    return getSubmodulePaths(workspace).then(submodules => {
        const workspaces = [workspace, ...submodules];
        return ls(workspace, workspaces, pack_directory).then(repositories => changeTime(repositories));
    });
}

async function ls(root_workspace: string, workspaces: string[], pack_directory: string): Promise<Repository[]> {
    return Promise.all(
        workspaces
            .map(workspace => {
                const name = path.relative(root_workspace, workspace);
                const directory = path.relative(workspace, pack_directory) || '.';
                if (directory.includes('..')) {
                    debug(`${name}/ is outside the pack_directory and doesn't run git log`);
                    return null;
                }
                return getExecOutput('git', ['-C', workspace, 'ls-files', '-z', directory], {
                    silent: true
                }).then(output => ({
                    name: name,
                    workspace: workspace,
                    files: output.stdout.split('\n').flatMap(line =>
                        line
                            .split('\0')
                            .filter(f => !!f)
                            .map(f => path.join(workspace, f))
                    ),
                    directory: directory
                }));
            })
            .filter(<T>(item: T | null): item is T => item !== null)
    );
}

async function changeTime(repositories: Repository[]) {
    await Promise.all(
        repositories.map(({ name, workspace, files, directory }) => {
            let time = new Date();
            debug(`Setting the modification time for ${files.length} files in ${name}/`);
            return Promise.race([
                getExecOutput('git', ['-C', workspace, 'log', '-m', '-r', '--name-only', '--no-color', '--pretty=raw', '-z', directory], {
                    silent: true
                }).then(async output => {
                    for (const line of output.stdout.split('\n')) {
                        const m = line.match(/^committer .*? (\d+) [-+]\d+$/);
                        if (m) {
                            time = new Date(parseInt(m[1]) * 1000);
                            continue;
                        }
                        const m1 = line.match(/(.+)\0\0commit [a-f0-9]{40}( \(from [a-f0-9]{40}\))?$/);
                        const m2 = line.match(/(.+)\0$/);
                        const list = (m1 ? m1[1] : m2 ? m2[1] : '')
                            .split(/\0/)
                            .filter(f => !!f)
                            .map(f => path.join(workspace, f));
                        if (list.length <= 0) {
                            continue;
                        }
                        for (const file of list) {
                            if (files.length === 0) {
                                return;
                            }
                            const index = files.indexOf(file);
                            if (index < 0) {
                                continue;
                            }
                            await utimes(file, time, time)
                                .then(() => files.splice(index, 1))
                                .catch(() => {
                                    // Ignore
                                });
                        }
                    }
                }),
                new Promise<void>(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, getIntegerInput(Options.FetchLogTimeout));
                })
            ]).then(() => {
                if (files.length !== 0) {
                    warning(`Time out log fetch for ${name}/. Remaining files: ${files.length}`);
                    Promise.all(
                        files.map(file =>
                            utimes(file, time, time).catch(() => {
                                // Ignore
                            })
                        )
                    );
                }
            });
        })
    );
}

export default setGitFileModificationTimes;
