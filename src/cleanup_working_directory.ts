import { setFailed } from "@actions/core";
import WorkingDirectory from "./working_directory";

new WorkingDirectory().rm().catch(err => setFailed(err));
