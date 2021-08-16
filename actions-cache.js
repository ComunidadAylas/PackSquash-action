const cache = require('@actions/cache')
const cached_file_paths = ['pack.zip', 'system_id', 'packsquash-options.toml']
const cache_key = `packsquash-zip-${process.env.GITHUB_WORKFLOW}`
const unique_cache_key = `${cache_key}-${Date.now()}`

async function run() {
    if (process.argv[2] === 'save') {
        await cache.saveCache(cached_file_paths, unique_cache_key)
    } else {
        await cache.restoreCache(cached_file_paths, unique_cache_key, [cache_key])
    }
}

// Do the cache operation. If that fails, log the error and return failure
run().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
})
