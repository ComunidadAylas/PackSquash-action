import { setFailed } from '@actions/core';

function run() {
    setFailed('Only Linux runner is supported.');
}

run();
