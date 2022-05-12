import * as path from 'path';
import { mkdir } from 'fs/promises';
import { getEnvOrThrow } from './util';
import * as uuid from 'uuid';

class WorkingDirectory {
    constructor() {
        this.path = path.join(getEnvOrThrow('RUNNER_TEMP'), uuid.v4());
    }

    async mkdir() {
        await mkdir(this.path, { recursive: true });
    }

    /**
     * @returns {string}
     */
    get packsquashBinary() {
        return path.join(this.path, 'packsquash');
    }

    /**
     * @returns {string}
     */
    get optionsFile() {
        return path.join(this.path, 'packsquash-options.toml');
    }

    /**
     * @returns {string}
     */
    get systemIdFile() {
        return path.join(this.path, 'system_id');
    }

    /**
     * @returns {string}
     */
    get outputFile() {
        return path.join(this.path, 'pack.zip');
    }

    /**
     * @returns {string}
     */
    get artifactFile() {
        return path.join(this.path, 'artifact.zip');
    }

    /**
     * @returns {string}
     */
    get problemMatcherFile() {
        return path.join(this.path, 'problem-matcher.json');
    }
}

export default WorkingDirectory;
