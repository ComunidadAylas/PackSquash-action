const artifact = require('@actions/artifact')
const artifact_name = 'Optimized pack'
const working_directory = process.cwd()

async function run() {
    await artifact.create().downloadArtifact(artifact_name, working_directory)
}

// Download the artifact. If that fails, log the error and return failure
run().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
})
