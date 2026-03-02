import { createWriteStream } from "node:fs";
import { copyFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { default as artifactClient } from "@actions/artifact";
import { debug, endGroup, info, startGroup } from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { getInputValue } from "./action_input";
import octokit from "./octokit";
import type { PackSquashOptions } from "./packsquash_options";
import type WorkingDirectory from "./working_directory";

export async function getCurrentWorkflowId(owner: string, repo: string, workflow: string) {
  const workflows = await octokit.request("GET /repos/{owner}/{repo}/actions/workflows", {
    owner: owner,
    repo: repo,
  });
  return workflows.data.workflows.find(w => w.name === workflow)?.id;
}

export async function uploadPackArtifact(workingDirectory: WorkingDirectory, packSquashOptions: PackSquashOptions) {
  if ("ACT" in process.env) {
    debug("Local act test environment detected. Skipping artifact upload");
    return;
  }

  startGroup("Upload generated ZIP file as artifact");
  const artifactName = getInputValue("artifact_name");
  const outputFilePath = packSquashOptions.getOutputFilePath();
  const artifactFilePath = await workingDirectory.temporaryFile("pack_artifact_upload", artifactName);

  await copyFile(outputFilePath, artifactFilePath);

  const response = await artifactClient.uploadArtifact(artifactName, [artifactFilePath], dirname(artifactFilePath), {
    skipArchive: true,
  });
  endGroup();

  if (!response?.size) {
    throw new Error("Artifact upload failed");
  }
}

export async function downloadLatestPackArtifact(
  owner: string,
  repo: string,
  branch: string,
  workflowId: number,
  artifactName: string,
  destinationPath: string,
) {
  info(`Downloading latest ${artifactName} artifact`);

  debug(
    `Getting latest run information for ${artifactName} artifact (repository: ${owner}/${repo}, branch: ${branch}, workflow ID: ${workflowId})`,
  );
  const workflows = await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
    owner: owner,
    repo: repo,
  });
  const latestRun = workflows.data.workflow_runs
    .filter(
      r =>
        r.head_branch === branch &&
        r.workflow_id === workflowId &&
        r.status === "completed" &&
        r.conclusion === "success",
    )
    .sort((r, s) => s.run_number - r.run_number)[0];
  if (!latestRun) {
    throw new Error(`Could not get the latest run information for the ${artifactName} artifact`);
  }

  debug(`Getting latest ${artifactName} artifact data`);
  const artifacts = await octokit.request("GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts", {
    owner: owner,
    repo: repo,
    run_id: latestRun.id,
  });
  const artifact = artifacts.data.artifacts.find(a => a.name === artifactName);
  if (!artifact) {
    throw new Error(`Could not get the latest ${artifactName} artifact data (#${latestRun.run_number})`);
  }

  const zip = await octokit.request("GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip", {
    owner: owner,
    repo: repo,
    artifact_id: artifact.id,
  });

  debug(`Downloading ${artifactName} artifact (#${latestRun.run_number})`);
  try {
    await pipeline((await new HttpClient().get(zip.url)).message, createWriteStream(destinationPath));
  } catch {
    throw new Error(`Could not download the latest ${artifactName} artifact`);
  }

  info(`Successfully downloaded the latest ${artifactName} artifact`);
}
