import { setFailed } from '@actions/core';
import WorkingDirectory from './working_directory';

async function run() {
    const workingDirectory = new WorkingDirectory();
    await workingDirectory.rm();
}

run().catch(err => setFailed(err));
