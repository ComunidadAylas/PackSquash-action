import { restoreCache, saveCache } from "@actions/cache";
import { endGroup, info, startGroup, warning } from "@actions/core";
import { context } from "@actions/github";
import { getInputValue } from "./action_input";
import type { PackSquashOptions } from "./packsquash_options";
import { getBranchName, md5Hash } from "./util";
import { downloadLatestArtifact, getCurrentWorkflowId } from "./workflow";
import type WorkingDirectory from "./working_directory";

export async function computeCacheKeys(packSquashOptions: PackSquashOptions) {
  const optionsHash = await md5Hash(packSquashOptions.stringifiedOptions);
  const cacheRevision = Buffer.from(getInputValue("action_cache_revision")).toString("base64");
  // Using different primary and restore keys is necessary to handle jobs
  // executing concurrently: if a job tries to write to a cache key that is
  // already being written to by another job, it will error out
  const restoreKey = `packsquash-1-${cacheRevision}-${getInputValue("packsquash_version")}-${optionsHash}`;
  const primaryKey = `${restoreKey}-${context.runId}-${context.job}`;
  return [primaryKey, restoreKey];
}

/**
 * Restore the system ID file from the cache and the pack ZIP from the previous
 * artifact if needed, and if this workflow has been run at least once
 * @returns Whether the pack ZIP from the previous artifact was restored or not
 */
export async function restorePackSquashCache(
  workingDirectory: WorkingDirectory,
  packSquashOptions: PackSquashOptions,
  key: string,
  restoreKeys: string[],
) {
  startGroup("Restoring cached data");

  let cacheRestored: boolean;
  if (getInputValue("system_id")) {
    // We only use the cache for storing the system ID we need to read the previous artifact, so if we already
    // have a fixed system ID, we can restore that artifact no matter what
    cacheRestored = true;
  } else {
    cacheRestored = !!(await restoreCache([workingDirectory.systemIdFile], key, restoreKeys));
  }

  if (cacheRestored) {
    try {
      const branch = getBranchName();
      if (branch) {
        const owner = context.repo.owner;
        const repo = context.repo.repo;
        const workflowId = await getCurrentWorkflowId(owner, repo, context.workflow);
        if (!workflowId) {
          throw new Error("Could not get current workflow ID");
        }

        await downloadLatestArtifact(
          workingDirectory,
          owner,
          repo,
          branch,
          workflowId,
          getInputValue("artifact_name"),
          packSquashOptions.getOutputFilePath(),
        );
      } else {
        info("Caching is unavailable for workflows triggered by tag events");
      }
    } catch (err) {
      warning(
        `Could not fetch the ZIP file generated in the last run. PackSquash will thus not be able to reuse it to speed up processing. This is a normal occurrence when running a workflow for the first time, or after a long time since its last execution. (${err})`,
      );
      cacheRestored = false;
    }
  }

  endGroup();

  return cacheRestored;
}

export async function savePackSquashCache(workingDirectory: WorkingDirectory, key: string) {
  startGroup("Caching data for future runs");
  await saveCache([workingDirectory.systemIdFile], key);
  endGroup();
}
