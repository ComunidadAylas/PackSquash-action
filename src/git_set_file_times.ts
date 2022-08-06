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
    debug(`Setting file modification times according to commit history for ${pack_directory}`);
    return getSubmodulePaths(workspace).then(async submodules => {
        debug(`Detected submodules: ${submodules}`);
        const workspaces = [workspace, ...submodules];
        const repositories = await ls(workspace, workspaces, pack_directory);
        return await changeTime(repositories);
    });
}

async function ls(root_workspace: string, workspaces: string[], pack_directory: string): Promise<Repository[]> {
    const repositories = await Promise.all(
        workspaces.map(async workspace => {
            const name = path.relative(root_workspace, workspace);
            const directory = path.relative(workspace, pack_directory);
            if (directory.includes('..')) {
                debug(`The pack directory is outside the candidate workspace ${name}/, ignoring it`);
                return null;
            }

            const output = await getExecOutput('git', ['-C', workspace, 'ls-files', '-z', directory], {
                silent: true
            });
            const files = new Set(
                output.stdout.split('\n').flatMap(line =>
                    line
                        .split('\0')
                        .filter(f => !!f)
                        .map(f => path.join(workspace, f))
                )
            );

            // Guard against no files to prevent git log later outputting nothing in changeTime
            if (files.size == 0) {
                debug(`There are no pack files in the candidate workspace ${name}/, ignoring it`);
                return null;
            }

            return {
                name: name,
                workspace: workspace,
                files: files,
                directory: directory
            };
        })
    );

    return repositories.filter((repository): repository is Repository => repository !== null);
}

async function changeTime(repositories: Repository[]) {
    await Promise.all(
        repositories.map(async ({ name, workspace, files, directory }) => {
            debug(`Setting the modification time for ${files.size} files in ${name}/`);
            const output = await getExecOutput('git', ['-C', workspace, 'log', '-m', '-r', '--name-only', '--no-color', '--pretty=format:%ct', '-z', directory], {
                silent: true
            });
            for (const line of output.stdout.split('\0\0')) {
                const [rawTime, rawFiles] = line.split('\n');
                const time = new Date(parseInt(rawTime) * 1000);
                for (const file of rawFiles.split('\0').map(f => path.join(workspace, f))) {
                    if (files.delete(file)) {
                        await utimes(file, time, time).catch(() => {
                            // Ignore
                        });
                    }
                    if (files.size === 0) {
                        return;
                    }
                }
            }
        })
    );
}

export default setGitFileModificationTimes;
