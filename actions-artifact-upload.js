const artifact = require('@actions/artifact')
const artifact_name = `Optimized pack (${process.env.GITHUB_WORKFLOW})`
const pack_zip = [`${process.cwd()}/pack.zip`]
const pack_zip_directory = process.cwd()

async function run() {
    const upload_result = await artifact.create()
        .uploadArtifact(artifact_name, pack_zip, pack_zip_directory)

    // Set an error exit code if no artifacts are to be uploaded, or we
    // failed to upload at least one of them
    process.exitCode = upload_result.artifactItems.length == 0 ||
        upload_result.failedItems.length > 0
}

// Upload the artifacts. If that fails, log the error and return failure
run().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
})
