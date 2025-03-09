import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Enables Jest-like `expect`
    environment: "node", // Change if testing browser-specific code
  },
});
