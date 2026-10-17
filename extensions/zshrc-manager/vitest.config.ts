import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true, // Jest-like globals (describe, it, expect, etc.)
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/__tests__/**/*.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".raycast"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
      // Ratchet: set just below current coverage so regressions fail while
      // `npm run validate` stays green. Raise as coverage grows.
      // Current: ~81 lines/statements.
      thresholds: {
        branches: 85,
        functions: 80,
        lines: 75,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@raycast/api": resolve(__dirname, "./src/__tests__/__mocks__/@raycast/api.ts"),
    },
  },
});
