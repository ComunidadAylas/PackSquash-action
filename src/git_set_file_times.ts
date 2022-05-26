import { getExecOutput } from '@actions/exec';
import { utimes } from 'fs/promises';
import * as path from 'path';
import { getSubmodulePaths } from './util';

interface Repository {
    workspace: string;
    files: string[];
}

async function setGitFileModificationTimes(workspace: string) {
    return getSubmodulePaths(workspace).then(submodules => {
        const workspaces = [workspace, ...submodules];
        return ls(workspaces).then(repositories => changeTime(repositories));
    });
}

async function ls(workspaces: string[]): Promise<Repository[]> {
    return Promise.all(
        workspaces.map(workspace =>
            getExecOutput('git', ['-C', workspace, 'ls-files', '-z'], {
                silent: true
            }).then(output => ({
                workspace: workspace,
                files: output.stdout.split('\n').flatMap(line =>
                    line
                        .split('\0')
                        .filter(f => !!f)
                        .map(f => path.join(workspace, f))
                )
            }))
        )
    );
}

async function changeTime(repositories: Repository[]) {
    await Promise.all(
        repositories.map(({ workspace, files }) =>
            getExecOutput('git', ['-C', workspace, 'log', '-m', '-r', '--name-only', '--no-color', '--pretty=raw', '-z'], {
                silent: true
            }).then(async output => {
                let time = new Date();
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
            })
        )
    );
}

export default setGitFileModificationTimes;
