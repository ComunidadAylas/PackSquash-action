import { chmod, rename } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { debug, warning } from "@actions/core";
import { HttpClient } from "@actions/http-client";
import DefaultManifest from "./manifests/binary_manifest.json";
import octokit from "./octokit";
import { extractFirstFileFromZip, getEnvOrThrow } from "./util";
import type WorkingDirectory from "./working_directory";

type PlatformSpecificString = { all?: string } & Record<string, Record<string, string | undefined> | undefined>;

/// The manifest version parsed by this action version. Used to remind users of older
/// action versions that support older manifest versions to update, and provide backwards
/// and forwards compatibility when making breaking changes to the manifest format.
/// Increment when a change to the manifest that requires new code to be properly parsed
/// is made, and then serve the new manifest on its corresponding vX slug. Older manifests
/// will be eventually removed.
const CURRENT_MANIFEST_VERSION = 2;

/// The environment variables to set when running builds, according to their type in the
/// manifest.
const BUILD_TYPE_RUN_ENV: Record<BuildManifest["type"], Record<string, string>> = {
  staticBinary: {},
};

/// Represents a PackSquash binary manifest that codifies how to download and run different
/// PackSquash versions.
///
/// This manifest is fetched at run-time by the action from the corresponding JSON file
/// in the repository. Any change to the JSON document for the same current manifest varsion
/// will be used when this action runs.
export class PackSquashBinaryManifest {
  /// The latest published manifest version, used for detecting manifest format changes.
  private readonly latestManifestVersion!: number;
  private readonly obsoleteMaximumSupportedManifestVersionMessage?: string;

  private readonly repoOwner!: string;
  private readonly repoName!: string;

  /// The latest release version.
  private readonly latestRelease!: string;

  /// The manifests to fetch unstable version ranges.
  private readonly unstable!: [UnstableBuildManifest];

  private constructor(data: PackSquashBinaryManifest) {
    Object.assign(this, data);

    if (CURRENT_MANIFEST_VERSION < this.latestManifestVersion) {
      warning(
        this.obsoleteMaximumSupportedManifestVersionMessage ??
          "This version of the action is obsolete and may not support some older or newer PackSquash versions. Please update at your earliest convenience",
      );
    }
  }

  public static async fetchManifest() {
    debug("Getting PackSquash binary manifest");

    let manifestJson: string;
    if ("ACT" in process.env) {
      debug("Local act test environment detected. Using manifest at working directory");

      manifestJson = JSON.stringify(DefaultManifest);
    } else {
      try {
        const httpResponse = await new HttpClient().get(
          `https://binarymanifests.action.packsquash.aylas.org/v${CURRENT_MANIFEST_VERSION}`,
        );
        manifestJson = await httpResponse.readBody();
      } catch (err) {
        warning(
          `Could not retrieve the latest PackSquash binary manifest: ${err}. The action will fall back to a default manifest, but this may cause errors. If this is not caused by a transient network issue, please update the action or report the problem`,
        );

        manifestJson = JSON.stringify(DefaultManifest);
      }
    }

    debug(`Got PackSquash binary manifest: ${manifestJson}`);

    return new PackSquashBinaryManifest(JSON.parse(manifestJson));
  }

  /// `version` may be one of:
  /// - `v...`: fetches the release version with the same version name.
  /// - `latest`: fetches the latest release version.
  /// - `latest-unstable`: fetches the latest unstable build.
  /// - Commit hash: fetches the unstable build generated for the specified mainline commit hash.
  public async download(version: string, workingDirectory: WorkingDirectory) {
    if (!version) {
      throw new Error("The PackSquash version was not specified in the action inputs, but it is required");
    }

    debug(`Downloading PackSquash, version: ${version}`);

    let manifest: BuildManifest | undefined;
    if (version.startsWith("v")) {
      if (this.latestRelease !== version) {
        warning(
          `PackSquash ${this.latestRelease} is available, but this workflow is using ${version}. Please update it at your earliest convenience to enjoy better support and the latest changes`,
        );
      }

      manifest = this.getVersionBuildManifest(version);
    } else if (version === "latest") {
      manifest = this.getVersionBuildManifest(this.latestRelease);
    } else {
      // Either the latest unstable build, or the unstable build generated for a given commit
      return await this.downloadUnstable(version, workingDirectory);
    }
    if (manifest === undefined) {
      throw new Error(`Invalid or unsupported PackSquash version: ${version}`);
    }

    return await this.downloadRelease(manifest, workingDirectory);
  }

  private async downloadRelease(manifest: BuildManifest, workingDirectory: WorkingDirectory) {
    debug(`Downloading release with manifest ${JSON.stringify(manifest)}`);

    await this.downloadFromManifest(manifest, workingDirectory);

    return BUILD_TYPE_RUN_ENV[manifest.type];
  }

  private async downloadUnstable(commit: string, workingDirectory: WorkingDirectory) {
    let commitTimestamp: number;
    if (commit === "latest-unstable") {
      commitTimestamp = Date.now();
    } else {
      debug(`Getting timestamp for commit ${commit}`);

      const commitDate = (
        await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
          owner: this.repoOwner,
          repo: this.repoName,
          ref: commit,
        })
      ).data.commit.author?.date;
      if (commitDate === undefined) {
        throw new Error(`Invalid PackSquash commit: ${commit}`);
      }

      commitTimestamp = Date.parse(commitDate);
    }
    commitTimestamp = Math.floor(commitTimestamp / 1000);

    debug(`Getting the first applicable unstable build manifest for timestamp ${commitTimestamp}`);

    const manifest = this.unstable.find(manifest => {
      const applicabilityPeriod = manifest.applicabilityPeriod;
      return (
        applicabilityPeriod.from <= commitTimestamp &&
        (applicabilityPeriod.to === "now" || applicabilityPeriod.to >= commitTimestamp)
      );
    });
    if (manifest === undefined) {
      throw new Error("No applicable unstable build manifest found");
    }

    debug(`Found applicable unstable build manifest: ${JSON.stringify(manifest)}`);

    await this.downloadFromManifest(manifest, workingDirectory, commit);

    return BUILD_TYPE_RUN_ENV[manifest.type];
  }

  private async downloadFromManifest(manifest: BuildManifest, workingDirectory: WorkingDirectory, commit?: string) {
    const httpClient = new HttpClient();
    if (manifest.fetch.strategy === "httpGetRequest") {
      const resolvedUrl = resolve(manifest.fetch.url);

      debug(`Fetching from ${resolvedUrl}`);

      await pipeline((await httpClient.get(resolvedUrl)).message, workingDirectory.temporaryDownloadFileWriteStream);
    } else if (manifest.fetch.strategy === "actionsWorkflowArtifact") {
      debug("Fetching workflow runs");

      const workflowId = manifest.fetch.workflowId;
      const artifactName = resolve(manifest.fetch.name);

      const workflowRuns = (
        await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
          owner: this.repoOwner,
          repo: this.repoName,
          status: "success",
          branch: manifest.fetch.branch,
          head_sha: commit === "latest-unstable" ? undefined : commit,
        })
      ).data.workflow_runs;

      const latestWorkflowRun = workflowRuns
        .filter(r => r.workflow_id === workflowId)
        .sort((r, s) => s.run_number - r.run_number)[0];
      if (!latestWorkflowRun) {
        throw new Error(
          "Could not find a workflow run to fetch the specified PackSquash version from. Please try again later",
        );
      }

      debug(`Fetching artifacts for run ${latestWorkflowRun.id}`);

      const runArtifacts = (
        await octokit.request("GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts", {
          owner: this.repoOwner,
          repo: this.repoName,
          run_id: latestWorkflowRun.id,
        })
      ).data.artifacts;

      const runArtifact = runArtifacts.find(artifact => artifact.name === artifactName);
      if (!runArtifact) {
        throw new Error(`Could not get the ${artifactName} artifact data for run #${latestWorkflowRun.run_number}`);
      }

      const artifactArchiveUrl = (
        await octokit.request("GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip", {
          owner: this.repoOwner,
          repo: this.repoName,
          artifact_id: runArtifact.id,
        })
      ).url;

      debug(`Downloading run artifact from ${artifactArchiveUrl}`);

      await pipeline(
        (await httpClient.get(artifactArchiveUrl)).message,
        workingDirectory.temporaryDownloadFileWriteStream,
      );
    }

    try {
      await extractFirstFileFromZip(workingDirectory.temporaryDownloadFile, workingDirectory.packsquashBinary);

      debug("Extracted binary from downloaded file");
    } catch (err) {
      // Assume that the downloaded file is not a ZIP, i.e. a binary we can run directly
      await rename(workingDirectory.temporaryDownloadFile, workingDirectory.packsquashBinary);

      debug(`Downloaded binary, extraction failure reason: ${err}`);
    }

    await chmod(workingDirectory.packsquashBinary, "500");
  }

  private getVersionBuildManifest(version: string) {
    // These type assertions are correct because no property of this class is named starting with v
    return (this as unknown as { [version: string]: BuildManifest | undefined })[version];
  }
}

type HttpGetRequestArtifactFetchManifest = {
  strategy: "httpGetRequest";
  url: PlatformSpecificString;
};

type ActionsWorkflowArtifactFetchManifest = {
  strategy: "actionsWorkflowArtifact";
  workflowId: number;
  branch: string;
  name: PlatformSpecificString;
};

interface BuildManifest {
  type: "staticBinary";
  fetch: HttpGetRequestArtifactFetchManifest | ActionsWorkflowArtifactFetchManifest;
}

interface UnstableBuildManifest extends BuildManifest {
  applicabilityPeriod: ApplicabilityPeriod;
}

/// The applicability period for an unstable builds manifest.
/// Periods are computed from the authoring time of the commit linked to the
/// requested unstable build.
interface ApplicabilityPeriod {
  /// The UNIX timestamp when the period this manifest applies to begins, in seconds.
  from: number;
  /// The UNIX timestamp when the period this manifest applies to ends, in seconds.
  /// The string "now" means that this period has not ended yet.
  to: number | "now";
}

function resolve(string: PlatformSpecificString) {
  const os = getEnvOrThrow("RUNNER_OS");
  const arch = getEnvOrThrow("RUNNER_ARCH");

  const resolvedString = string.all === undefined ? string?.[os.toLowerCase()]?.[arch.toLowerCase()] : string.all;
  if (resolvedString === undefined) {
    throw new Error(
      `The specified PackSquash version can't be run on a ${os} ${arch} runner. Please switch to a runner on a supported OS and architecture, or request support for it`,
    );
  }

  debug(`Resolved platform-specific string ${JSON.stringify(string)} to ${resolvedString}`);

  return resolvedString;
}
