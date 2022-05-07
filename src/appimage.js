import { debug, getInput, info, setFailed } from '@actions/core';
import { chmodSync } from 'fs';
import { Options } from './options';
import { getMachineType } from './util';
import { exec } from '@actions/exec';
import { downloadLatestArtifact } from './workflow';

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function downloadAppImage(workingDirectory) {
    const version = getInput(Options.PackSquashVersion);
    debug(`PackSquash version input variable value: ${version}`);
    const machine = await getMachineType();
    debug(`Container machine type: ${machine}`);

    let machine_infix;
    switch (version) {
        case 'v0.1.0':
        case 'v0.1.1':
        case 'v0.1.2':
        case 'v0.2.0':
        case 'v0.2.1':
        case 'v0.3.0-rc.1':
        case 'v0.3.0':
            setFailed(`Unsupported PackSquash version: ${version}. Please use PackSquash-action@v2 instead.`);
            break;
        case 'latest':
            switch (machine) {
                case 'x86_64':
                    machine_infix = 'x64';
                    break;
                case 'arm64':
                case 'aarch64':
                    machine_infix = 'arm64';
                    break;
                default:
                    setFailed(`The latest PackSquash build does not support ${machine}. Please use a runner with a supported architecture, or request support for it.`);
            }
            await downloadLatestAppImage(workingDirectory, machine_infix);
            break;
        case 'v0.3.1':
            switch (machine) {
                case 'x86_64':
                    machine_infix = 'x86_64';
                    break;
                case 'arm64':
                case 'aarch64':
                    machine_infix = 'aarch64';
                    break;
                default:
                    setFailed(
                        `PackSquash ${version} does not support ${machine}. Please use a runner with a supported architecture, or request support for it. A newer version might add support for this architecture.`
                    );
            }
            await downloadReleaseAppImage(workingDirectory, version, `PackSquash-${version}-${machine_infix}.AppImage`);
            break;
        default:
            setFailed(`Unsupported PackSquash version: ${version}`);
    }
    chmodSync(workingDirectory.packsquash, '755');
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} machine_infix
 * @returns {Promise<void>}
 */
async function downloadLatestAppImage(workingDirectory, machine_infix) {
    await downloadLatestArtifact(workingDirectory, 'ComunidadAylas', 'PackSquash', 'master', 5482008, `PackSquash CLI AppImage (${machine_infix})`, workingDirectory.packsquash);
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} version
 * @param {string} asset_name
 * @returns {Promise<void>}
 */
async function downloadReleaseAppImage(workingDirectory, version, asset_name) {
    info(`Downloading PackSquash AppImage for release ${version} (asset ${asset_name})`);
    await exec('curl', ['-sSL', '-o', workingDirectory.packsquash, `https://github.com/ComunidadAylas/PackSquash/releases/download/${version}/${asset_name}`]);
}
