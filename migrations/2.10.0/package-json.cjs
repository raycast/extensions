module.exports = function migratePackageJSON(packageJSON) {
  const versions = {
    "@types/node": "26.6.5",
    "@types/react": "19.3.0",
    react: "19.3.1",
    "react-devtools": "8.0.0",
  };

  for (const [name, version] of Object.entries(versions)) {
    let declared = false;
    for (const section of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
    ]) {
      if (Object.hasOwn(packageJSON[section] || {}, name)) {
        packageJSON[section][name] = version;
        declared = true;
      }
    }

    // React comes from the API; DevTools remains an optional developer install.
    if (!declared && name.startsWith("@types/")) {
      packageJSON.devDependencies ||= {};
      packageJSON.devDependencies[name] = version;
    }
  }
};
