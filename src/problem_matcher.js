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

/**
 * @param {string} path
 */
export async function addProblemMatcher(path) {
    await writeFile(path, JSON.stringify(json));
    info(`##[add-matcher]${path}`);
}

/**
 * @param {string} path
 */
export function removeProblemMatcher(path) {
    info(`##[remove-matcher]${path}`);
}
