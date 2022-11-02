import { debug, info } from '@actions/core';
import { chmod } from 'fs/promises';
import { downloadFile, getEnvOrThrow } from './util';
import { downloadLatestArtifact } from './workflow';
import WorkingDirectory from './working_directory';
import { getInputValue } from './action_input';

export async function downloadAppImage(workingDirectory: WorkingDirectory) {
    const version = getInputValue('packsquash_version');
    debug(`PackSquash version input variable value: ${version}`);
    const arch = getEnvOrThrow('RUNNER_ARCH');
    debug(`Runner architecture: ${arch}`);

    let archInfix;
    switch (arch) {
        case 'X64':
            archInfix = 'x86_64';
            break;
        case 'ARM64':
            archInfix = 'aarch64';
            break;
        default:
            throw Error(`The ${arch} architecture is not supported by this action. Please use a runner with a supported architecture.`);
    }

    switch (version) {
        case 'v0.3.1':
            await downloadReleaseAppImage(workingDirectory, version, `PackSquash-${version}-${archInfix}.AppImage`);
            break;
        case 'latest':
            await downloadLatestAppImage(workingDirectory, archInfix);
            break;
        default:
            throw Error(`Unsupported PackSquash version: ${version}`);
    }

    await chmod(workingDirectory.packsquashBinary, '755');
}

async function downloadLatestAppImage(workingDirectory: WorkingDirectory, archInfix: string) {
    await downloadLatestArtifact(workingDirectory, 'ComunidadAylas', 'PackSquash', 'master', 32465409, `PackSquash CLI AppImage (${archInfix})`, workingDirectory.packsquashBinary);
}

async function downloadReleaseAppImage(workingDirectory: WorkingDirectory, version: string, assetName: string) {
    info(`Downloading PackSquash AppImage for release ${version} (asset ${assetName})`);
    await downloadFile(`https://github.com/ComunidadAylas/PackSquash/releases/download/${version}/${assetName}`, workingDirectory.packsquashBinary);
}
