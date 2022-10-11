import { info } from '@actions/core';
import { writeFile } from 'fs/promises';

const json = {
    // Matchers are tested in order for each input line. The first who matches wins,
    // and the rest are reset for the next input line. Therefore, put most specific
    // ones first
    problemMatcher: [
        {
            owner: 'packsquash-file-error',
            severity: 'error',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[[0-9;]*m?)*[!❌] ((?:assets|data)\\/.+?): (.+?)(?:\x1B\\[0m)?$',
                    file: 1,
                    message: 2
                }
            ]
        },
        {
            owner: 'packsquash-error',
            severity: 'error',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[[0-9;]*m?)*[!❌] (.+?)(?:\x1B\\[0m)?$',
                    message: 1
                }
            ]
        },
        {
            owner: 'packsquash-file-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[[0-9;]*m?)*[>🏁] (.+): .+$',
                    file: 1
                },
                {
                    regexp: '^(?:\x1B\\[[0-9;]*m?)* {2,3}[*⚡] (.+?)(?:\x1B\\[0m)?$',
                    message: 1,
                    loop: true
                }
            ]
        },
        {
            owner: 'packsquash-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[[0-9;]*m?)*[*⚡] (.+?)(?:\x1B\\[0m)?$',
                    message: 1
                }
            ]
        }
    ]
};

export async function addProblemMatcher(path: string) {
    await writeFile(path, JSON.stringify(json));
    info(`::add-matcher::${path}`);
}

export function removeProblemMatcher(path: string) {
    info(`::remove-matcher::${path}`);
}
