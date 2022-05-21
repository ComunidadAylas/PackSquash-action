import { info } from '@actions/core';
import { writeFile } from 'fs/promises';

const json = {
    problemMatcher: [
        {
            owner: 'packsquash-error',
            severity: 'error',
            pattern: [
                {
                    regexp: '^[!❌] (?!.*Invalid stick parity bit)(.+)$',
                    message: 1
                }
            ]
        },
        {
            owner: 'packsquash-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^[*⚡] (.+)$',
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
