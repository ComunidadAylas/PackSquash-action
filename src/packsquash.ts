import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { debug, endGroup, setSecret, startGroup } from "@actions/core";
import { exec } from "@actions/exec";
import { getInputValue } from "./action_input";
import type { PackSquashOptions } from "./packsquash_options";
import { addProblemMatcher, removeProblemMatcher } from "./problem_matcher";
import type WorkingDirectory from "./working_directory";

const prettyOutputEnvironment = {
  PACKSQUASH_EMOJI: getInputValue("show_emoji_in_packsquash_logs") ? "show" : "",
  PACKSQUASH_COLOR: getInputValue("enable_color_in_packsquash_logs") ? "show" : "",
};

export async function printPackSquashVersion(environment: Record<string, string>, workingDirectory: WorkingDirectory) {
  startGroup("PackSquash version");
  await exec(workingDirectory.packsquashBinary, ["--version"], {
    env: {
      ...prettyOutputEnvironment,
      ...environment,
    },
  });
  endGroup();
}

export async function runPackSquash(
  packSquashOptions: PackSquashOptions,
  environment: Record<string, string>,
  workingDirectory: WorkingDirectory,
) {
  const systemId = await getSystemId(workingDirectory);
  debug(`Using system ID: ${systemId}`);
  setSecret(systemId);

  await addProblemMatcher(workingDirectory.problemMatcherFile);

  startGroup("PackSquash output");
  const exitCode = await exec(workingDirectory.packsquashBinary, [], {
    input: Buffer.from(packSquashOptions.stringifiedOptions),
    env: {
      PACKSQUASH_SYSTEM_ID: systemId,
      ...prettyOutputEnvironment,
      ...environment,
    },
  });
  endGroup();

  removeProblemMatcher(workingDirectory.problemMatcherFile);

  switch (exitCode) {
    case 0:
      // Success
      break;
    default:
      // Any other PackSquash error
      throw new Error(`PackSquash finished with an error code: ${exitCode}`);
  }
}

async function getSystemId(workingDirectory: WorkingDirectory) {
  const inputSystemId = getInputValue("system_id");
  if (inputSystemId) {
    await writeFile(workingDirectory.systemIdFile, inputSystemId, "utf8");
    return inputSystemId;
  }

  let cachedOrGeneratedSystemId: string;
  try {
    // Try with any cached system ID we may have first, to reuse results
    // from previous runs
    cachedOrGeneratedSystemId = await readFile(workingDirectory.systemIdFile, "utf8");
  } catch {
    // We don't have a cached system ID or an I/O error happened.
    // Generate a new random one
    cachedOrGeneratedSystemId = randomBytes(32).toString("hex");
    await writeFile(workingDirectory.systemIdFile, cachedOrGeneratedSystemId, "utf8");
  }

  return cachedOrGeneratedSystemId;
}
