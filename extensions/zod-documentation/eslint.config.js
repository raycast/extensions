import raycastConfig from "@raycast/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...raycastConfig,
  reactHooks.configs.flat.recommended,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      "unicorn/better-regex": "warn",
      "unicorn/prevent-abbreviations": "off",
    },
  },
]);
