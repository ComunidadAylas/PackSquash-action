import { writeFileSync } from 'fs'
import { saveCache, restoreCache } from '@actions/cache'

const cached_file_paths = [process.argv[2]]
const cache_key = `packsquash-${process.argv[4]}-0-${process.argv[5]}`

async function run() {
    if (process.argv[3] === 'save') {
        await saveCache(cached_file_paths, cache_key)
    } else {
        return await restoreCache(cached_file_paths, cache_key) !== undefined
    }
}

// Do the cache operation. If that fails, log the error and return failure
run().then(
    (restored_cache_key) => {
        if (restored_cache_key === true) {
            writeFileSync('/run/packsquash-cache-hit', '')
        }
    },
    (failure_reason) => {
        console.error(failure_reason)
        process.exitCode = 1
    }
)
