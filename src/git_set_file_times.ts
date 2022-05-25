import { getExecOutput } from '@actions/exec';
import { utimes } from 'fs/promises';

async function setGitFileModificationTimes() {
    return await ls().then(list => changeTime(list));
}

async function ls() {
    return getExecOutput('git', ['ls-files', '-z'], { silent: true }).then(output => {
        const ls: string[] = [];
        output.stdout.split('\n').forEach(line => {
            ls.push(...line.split('\0').filter(f => !!f));
        });
        return ls;
    });
}

async function changeTime(files: string[]) {
    return getExecOutput('git', ['log', '-m', '-r', '--name-only', '--no-color', '--pretty=raw', '-z'], { silent: true }).then(async output => {
        let time = new Date();
        for (const line of output.stdout.split('\n')) {
            const m = line.match(/^committer .*? (\d+) [-+]\d+$/);
            if (m) {
                time = new Date(parseInt(m[1]) * 1000);
                continue;
            }
            const m1 = line.match(/(.+)\0\0commit [a-f0-9]{40}( \(from [a-f0-9]{40}\))?$/);
            const m2 = line.match(/(.+)\0$/);
            const list = (m1 ? m1[1] : m2 ? m2[1] : '').split(/\0/);
            if (list.length <= 0) {
                continue;
            }
            for (const file of list) {
                if (!file) {
                    continue;
                }
                const index = files.indexOf(file);
                if (index < 0) {
                    continue;
                }
                await utimes(file, time, time)
                    .then(() => files.splice(index, 1))
                    .catch(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
            }
        }
    });
}

export default setGitFileModificationTimes;
