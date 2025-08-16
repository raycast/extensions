import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "**/*.d.ts",
        "raycast-env.d.ts",
        "eslint.config.js",
        "vitest.config.ts",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
    exclude: ["node_modules/", "dist/"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
