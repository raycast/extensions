import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@raycast/api": new URL("./test/raycast-api-stub.ts", import.meta.url).pathname,
    },
  },
});
