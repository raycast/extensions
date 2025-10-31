import { createRequire } from "module";

const require = createRequire(import.meta.url);
const js = require("@eslint/js");
const typescript = require("typescript-eslint");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
  },
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },
  prettier,
];
