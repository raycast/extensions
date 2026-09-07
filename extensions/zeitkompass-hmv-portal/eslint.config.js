// Flat config for the Raycast extension.
//
// It exists mainly to stop ESLint's config lookup from walking up into the
// portal's own `eslint.config.mjs`, which ignores `raycast/**` (Next.js rules
// do not apply to a Raycast extension) - with that config in scope, `ray lint`
// found zero files to lint and failed. Keeping the rules here also means the
// extension can be lifted into its own repository unchanged.
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const raycast = require("@raycast/eslint-plugin");

module.exports = [
  { ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "@typescript-eslint": tsPlugin, "@raycast": raycast },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // Raycast's own conventions: Title Case on user-facing action titles,
      // and no useless `useEffect` on mount where the API has a hook.
      "@raycast/prefer-title-case": "warn",
    },
  },
];
