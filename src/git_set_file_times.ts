import { getExecOutput } from '@actions/exec';
import { utimes } from 'fs/promises';
import * as path from 'path';
import { getSubmodulePaths } from './util';
import { debug } from '@actions/core';

interface Repository {
    name: string;
    workspace: string;
    files: Set<string>;
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
                    files: new Set(
                        output.stdout.split('\n').flatMap(line =>
                            line
                                .split('\0')
                                .filter(f => !!f)
                                .map(f => path.join(workspace, f))
                        )
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
            debug(`Setting the modification time for ${files.size} files in ${name}/`);
            return getExecOutput('git', ['-C', workspace, 'log', '-m', '-r', '--name-only', '--no-color', '--pretty=format:%ct', '-z', directory], {
                silent: true
            }).then(async output => {
                for (const line of output.stdout.split('\0\0')) {
                    const [rawTime, rawFiles] = line.split('\n');
                    const time = new Date(parseInt(rawTime) * 1000);
                    for (const file of rawFiles.split('\0').map(f => path.join(workspace, f))) {
                        if (files.size === 0) {
                            return;
                        }
                        if (files.delete(file)) {
                            await utimes(file, time, time).catch(() => {
                                // Ignore
                            });
                        }
                    }
                }
            });
        })
    );
}

export default setGitFileModificationTimes;
