import { debug, exportVariable, getInput, setSecret } from '@actions/core';
import { Options } from './options';
import { readFile, writeFile } from 'fs/promises';
import * as uuid from 'uuid';

/**
 * @param {WorkingDirectory} workingDirectory
 */
export async function setSystemIdVariable(workingDirectory) {
    const systemId = await getSystemId(workingDirectory);
    debug(`Using system ID: ${systemId}`);
    setSecret(systemId);
    exportVariable('PACKSQUASH_SYSTEM_ID', systemId);
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<string>}
 */
function getSystemId(workingDirectory) {
    const inputSystemId = getInput(Options.SystemId);
    if (inputSystemId) {
        return new Promise(resolve => {
            resolve(inputSystemId);
        });
    }
    return readFile(workingDirectory.systemIdFile, { encoding: 'utf8' }).then(async cachedSystemId => {
        if (cachedSystemId) {
            return cachedSystemId;
        }
        const systemId = uuid.v4();
        await writeFile(workingDirectory.systemIdFile, systemId, { encoding: 'utf8' });
        return systemId;
    });
}
