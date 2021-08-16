const cache = require('@actions/cache')
const cached_file_paths = ['system_id']
const cache_key = `packsquash-${process.argv[2]}`

async function run() {
    if (process.argv[2] === 'save') {
        await cache.saveCache(cached_file_paths, cache_key)
    } else {
        return await cache.restoreCache(cached_file_paths, cache_key)
    }
}

// Do the cache operation. If that fails, log the error and return failure
run().then(
    (restored_cache_key) => {
        if (restored_cache_key !== undefined) {
            process.stdout.write(restored_cache_key)
        }
    },
    (failure_reason) => {
        console.error(failure_reason)
        process.exitCode = 1
    }
)