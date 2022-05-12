import { setFailed } from '@actions/core';

async function run() {
    throw Error('Only Linux runner is supported.');
}

run().catch(err => setFailed(err));
