import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./tests/mocks/raycast-api.ts", import.meta.url)),
    },
  },
});
