import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    main: "src/index.ts",
    cleanup_working_directory: "src/cleanup_working_directory.ts",
  },
  deps: {
    alwaysBundle: /.*/,
    onlyBundle: false,
  },
});
