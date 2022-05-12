import { debug, getInput, info } from '@actions/core';
import { chmod } from 'fs/promises';
import { Options } from './options';
import { downloadFile, getArchitecture } from './util';
import { downloadLatestArtifact } from './workflow';

/**
 * @param {WorkingDirectory} workingDirectory
 * @returns {Promise<void>}
 */
export async function downloadAppImage(workingDirectory) {
    const version = getInput(Options.PackSquashVersion);
    debug(`PackSquash version input variable value: ${version}`);
    const arch = getArchitecture();
    debug(`Runner architecture: ${arch}`);

    let arch_infix;
    switch (version) {
        case 'v0.1.0':
        case 'v0.1.1':
        case 'v0.1.2':
        case 'v0.2.0':
        case 'v0.2.1':
        case 'v0.3.0-rc.1':
        case 'v0.3.0':
            throw Error(`Unsupported PackSquash version: ${version}. Please use PackSquash-action@v2 instead.`);
        case 'latest':
            switch (arch) {
                case 'X64':
                    arch_infix = 'x64';
                    break;
                case 'ARM64':
                    arch_infix = 'arm64';
                    break;
                default:
                    throw Error(`The latest PackSquash build does not support ${arch}. Please use a runner with a supported architecture, or request support for it.`);
            }
            await downloadLatestAppImage(workingDirectory, arch_infix);
            break;
        case 'v0.3.1':
            switch (arch) {
                case 'X64':
                    arch_infix = 'x86_64';
                    break;
                case 'ARM64':
                    arch_infix = 'aarch64';
                    break;
                default:
                    throw Error(
                        `PackSquash ${version} does not support ${arch}. Please use a runner with a supported architecture, or request support for it. A newer version might add support for this architecture.`
                    );
            }
            await downloadReleaseAppImage(workingDirectory, version, `PackSquash-${version}-${arch_infix}.AppImage`);
            break;
        default:
            throw Error(`Unsupported PackSquash version: ${version}`);
    }
    await chmod(workingDirectory.packsquashBinary, '755');
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} arch_infix
 * @returns {Promise<void>}
 */
async function downloadLatestAppImage(workingDirectory, arch_infix) {
    await downloadLatestArtifact(workingDirectory, 'ComunidadAylas', 'PackSquash', 'master', 5482008, `PackSquash CLI AppImage (${arch_infix})`, workingDirectory.packsquashBinary);
}

/**
 * @param {WorkingDirectory} workingDirectory
 * @param {string} version
 * @param {string} asset_name
 * @returns {Promise<void>}
 */
async function downloadReleaseAppImage(workingDirectory, version, asset_name) {
    info(`Downloading PackSquash AppImage for release ${version} (asset ${asset_name})`);
    await downloadFile(`https://github.com/ComunidadAylas/PackSquash/releases/download/${version}/${asset_name}`, workingDirectory.packsquashBinary);
}
