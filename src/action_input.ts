import { getBooleanInput, getInput } from '@actions/core';

const ActionInputsObject = {
    options_file: 'string',
    system_id: 'string',
    packsquash_version: 'string',
    token: 'string',
    action_cache_revision: 'string',
    artifact_name: 'string',
    show_emoji_in_packsquash_logs: true,
    enable_color_in_packsquash_logs: true
};

export type ActionInputIdentifier = keyof typeof ActionInputsObject;

export function getInputValue<T extends ActionInputIdentifier>(input: T): typeof ActionInputsObject[T] {
    switch (typeof ActionInputsObject[input]) {
        case 'string':
            return getInput(input) as never;
        case 'boolean':
            return getBooleanInput(input) as never;
    }
}
