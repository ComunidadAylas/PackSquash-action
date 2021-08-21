import { create } from '@actions/artifact'

const artifact_name = process.argv[4]
const artifact_file = [process.argv[3]]
const artifact_file_directory = process.argv[2]

async function run() {
    const upload_result = await create()
        .uploadArtifact(artifact_name, artifact_file, artifact_file_directory)

    // Set an error exit code if no artifact is to be uploaded, or we
    // failed to upload it
    process.exitCode = upload_result.artifactItems.length == 0 ||
        upload_result.failedItems.length > 0
}

// Upload the artifact. If that fails, log the error and return failure
run().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
})
