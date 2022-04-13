import { create } from "@actions/artifact";
import { restoreCache, saveCache } from "@actions/cache";
import { writeFileSync } from "fs";

async function run() {
    if (process.argv[2] === 'upload_artifact') {
        const artifact_name = process.argv[5]
        const artifact_file = [process.argv[4]]
        const artifact_file_directory = process.argv[3]

        const upload_result = await create()
            .uploadArtifact(artifact_name, artifact_file, artifact_file_directory)

        process.exitCode = upload_result.artifactItems.length == 0 ||
            upload_result.failedItems.length > 0
    } else if (process.argv[2] === 'save_cache') {
        const cached_file_paths = [process.argv[3]]
        const cache_key = `packsquash-0-${process.argv[4]}`

        await saveCache(cached_file_paths, cache_key)
    } else if (process.argv[2] === 'restore_cache') {
        const cached_file_paths = [process.argv[3]]
        const cache_key = `packsquash-0-${process.argv[4]}`
        const restore_key = `packsquash-0-${process.argv[5]}`

        const restored_cache_key = await restoreCache(cached_file_paths, cache_key, [restore_key])
        if (restored_cache_key) {
            writeFileSync('/run/packsquash-cache-hit', '')
        }
    }
}

run().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
})
