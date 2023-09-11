import { API, FileInfo, Transform } from "jscodeshift";

const transform: Transform = (file: FileInfo, api: API) => {
  if (!file.path.includes(".eslintrc.json")) {
    // Ignore files that don't match the file name pattern
    return null;
  }

  const j = api.jscodeshift;

  const originalJson = JSON.parse(file.source);

  // Remove the env, and parser properties, it's unlikely that these have been modified by the extension authors
  delete originalJson.env;
  delete originalJson.parser;

  // Remove the "@typescript-eslint" value from the plugins property but keep the other values
  const originalPlugins = originalJson.plugins;
  if (Array.isArray(originalPlugins)) {
    originalJson.plugins = originalPlugins.filter(
      (plugin) => plugin !== "@typescript-eslint"
    );
  }

  // Remove the plugins property if it's empty
  if (originalJson.plugins.length === 0) {
    delete originalJson.plugins;
  }

  // Remove the "eslint:recommended", "plugin:@typescript-eslint/recommended", and "prettier" values
  // from the extends property but keep the other values
  const originalExtends = originalJson.extends;
  if (Array.isArray(originalExtends)) {
    originalJson.extends = [
      ...new Set([...originalExtends, "@raycast"]),
    ].filter(
      (extend) =>
        ![
          "eslint:recommended",
          "plugin:@typescript-eslint/recommended",
          "prettier",
        ].includes(extend)
    );
  } else {
    originalJson.extends = ["@raycast"];
  }

  // Filter out any properties with null or undefined values
  const filteredJson = Object.fromEntries(
    Object.entries(originalJson).filter(([_, v]) => v != null)
  );

  // Return the filtered JSON content
  return JSON.stringify(filteredJson, null, 2);
};

export default transform;
