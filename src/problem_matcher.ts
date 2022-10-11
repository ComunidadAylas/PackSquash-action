import { info } from '@actions/core';
import { writeFile } from 'fs/promises';

const json = {
    problemMatcher: [
        {
            owner: 'packsquash-error',
            severity: 'error',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*[!❌] (?!.*Invalid stick parity bit)(.+?)(?:\x1B\\[0m)?$',
                    message: 1
                }
            ]
        },
        {
            owner: 'packsquash-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*[*⚡] (.+?)(?:\x1B\\[0m)?$',
                    message: 1
                }
            ]
        },
        {
            owner: 'packsquash-file-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*[*⚡] (.+): .+$',
                    file: 1
                },
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*   ?[*⚡] (.+?)(?:\x1B\\[0m)?$',
                    message: 1,
                    loop: 1
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
