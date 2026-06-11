const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
]);
