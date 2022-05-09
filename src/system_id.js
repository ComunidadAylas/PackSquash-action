import { debug, exportVariable, getInput, setSecret } from '@actions/core';
import { Options } from './options';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as uuid from 'uuid';

/**
 * @param {WorkingDirectory} workingDirectory
 */
export function setSystemIdVariable(workingDirectory) {
    const systemId = getSystemId(workingDirectory);
    debug(`Using system ID: ${systemId}`);
    setSecret(systemId);
    exportVariable('PACKSQUASH_SYSTEM_ID', systemId);
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {string}
 */
function getSystemId(workingDirectory) {
    const inputSystemId = getInput(Options.SystemId);
    if (inputSystemId) {
        return inputSystemId;
    }
    if (existsSync(workingDirectory.systemIdFile)) {
        const cachedSystemId = readFileSync(workingDirectory.systemIdFile, { encoding: 'utf8' });
        if (cachedSystemId) {
            return cachedSystemId;
        }
    }
    const systemId = uuid.v4();
    writeFileSync(workingDirectory.systemIdFile, systemId, { encoding: 'utf8' });
    return systemId;
}
