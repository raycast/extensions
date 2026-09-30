import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      // Mock @raycast/utils to avoid transitive @raycast/api dependency in tests
      "@raycast/utils": new URL("./test/__mocks__/raycast-utils.ts", import.meta.url).pathname,
    },
  },
});
