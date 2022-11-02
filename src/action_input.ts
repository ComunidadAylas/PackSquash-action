import { getBooleanInput, getInput } from '@actions/core';

// Dummy object. Only the keys and the type of the property values matters
const ActionInputsObject = {
    options: 'string',
    system_id: 'string',
    packsquash_version: 'string',
    token: 'string',
    action_cache_revision: 'string',
    artifact_name: 'string',
    show_emoji_in_packsquash_logs: true,
    enable_color_in_packsquash_logs: true
};

export type ActionInputIdentifier = keyof typeof ActionInputsObject;
type ActionInputValue<T extends ActionInputIdentifier> = (typeof ActionInputsObject)[T];

export function getInputValue<T extends ActionInputIdentifier>(input: T): ActionInputValue<T> {
    switch (typeof ActionInputsObject[input]) {
        case 'string':
            return getInput(input) as ActionInputValue<T>;
        case 'boolean':
            return getBooleanInput(input) as ActionInputValue<T>;
    }
}
