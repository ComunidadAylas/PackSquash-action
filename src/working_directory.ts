import * as path from 'path';
import { mkdir, rm } from 'fs/promises';
import { getEnvOrThrow } from './util';
import { createWriteStream } from 'fs';

/**
 * Represents the PackSquash working directory, where any files necessary for
 * its operation will be temporarily stored.
 *
 * The contents of this working directory are step-private and not meant to be
 * read outside the action. The action should clean it up after finishing.
 * Its contents may change between releases without notice.
 */
class WorkingDirectory {
    path: string;
    binaryExtension: string;

    constructor() {
        this.path = path.join(getEnvOrThrow('RUNNER_TEMP'), 'packsquash');
        this.binaryExtension = getEnvOrThrow('RUNNER_OS') == 'Windows' ? '.exe' : '';
    }

    async rm() {
        await rm(this.path, { recursive: true, force: true });
    }

    async mkdir() {
        await mkdir(this.path, { recursive: true });
    }

    get packsquashBinary() {
        return path.join(this.path, `packsquash${this.binaryExtension}`);
    }

    get systemIdFile() {
        return path.join(this.path, 'system_id');
    }

    get defaultOutputFile() {
        return path.join(this.path, 'pack.zip');
    }

    get temporaryDownloadFile() {
        return path.join(this.path, 'download');
    }

    get temporaryDownloadFileWriteStream() {
        return createWriteStream(this.temporaryDownloadFile);
    }

    get problemMatcherFile() {
        return path.join(this.path, 'problem-matcher.json');
    }
}

export default WorkingDirectory;
