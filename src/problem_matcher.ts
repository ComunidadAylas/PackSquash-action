import { info } from '@actions/core';
import { writeFile } from 'fs/promises';

const json = {
    problemMatcher: [
        {
            owner: 'packsquash-error',
            severity: 'error',
            pattern: [
                // Workaround for https://github.com/actions/runner/blob/44d4d076fec3fddaf68c876cbea2217110d48892/src/Runner.Worker/IssueMatcher.cs#L449-L453
                {
                    regexp: '^.*$'
                },
                // message can't be set by several patterns, and when looping, it can only be set by the looping pattern.
                // Work around that by matching error start lines as continuation lines, with the downside of considering
                // consecutive errors as if they were a single error
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*(?:[!❌] | {2,3})(.+?)(?:\x1B\\[0m)?$',
                    message: 1,
                    loop: true
                }
            ]
        },
        {
            owner: 'packsquash-warning',
            severity: 'warning',
            pattern: [
                // Workaround for https://github.com/actions/runner/blob/44d4d076fec3fddaf68c876cbea2217110d48892/src/Runner.Worker/IssueMatcher.cs#L449-L453
                {
                    regexp: '^.*$'
                },
                // message can't be set by several patterns, and when looping, it can only be set by the looping pattern.
                // Work around that by matching error start lines as continuation lines, with the downside of considering
                // consecutive errors as if they were a single error
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*(?:[*⚡] | {2,3})(.+?)(?:\x1B\\[0m)?$',
                    message: 1,
                    loop: true
                }
            ]
        },
        {
            owner: 'packsquash-file-warning',
            severity: 'warning',
            pattern: [
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)*[>🏁] (.+): .+$',
                    file: 1
                },
                {
                    regexp: '^(?:\x1B\\[\\d+\\w*)* {2,3}[*⚡] (.+?)(?:\x1B\\[0m)?$',
                    message: 1,
                    loop: true
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
