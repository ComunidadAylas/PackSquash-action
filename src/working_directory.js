import * as path from 'path';
import { mkdirSync } from 'fs';

class WorkingDirectory {
    /**
     * @param {string} path
     */
    constructor(path) {
        this.path = path;
        mkdirSync(this.path, { recursive: true });
    }

    /**
     * @returns {string}
     */
    get packsquash() {
        return path.join(this.path, 'packsquash');
    }

    /**
     * @returns {string}
     */
    get options() {
        return path.join(this.path, 'packsquash-options.toml');
    }

    /**
     * @returns {string}
     */
    get systemId() {
        return path.join(this.path, 'system_id');
    }

    /**
     * @returns {string}
     */
    get zip() {
        return path.join(this.path, 'pack.zip');
    }

    /**
     * @returns {string}
     */
    get artifact() {
        return path.join(this.path, 'artifact.zip');
    }

    /**
     * @returns {string}
     */
    get problemMatcher() {
        return path.join(this.path, 'problem-matcher.json');
    }
}

export default WorkingDirectory;
