const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size");
const process = require("process");

const errorEmoji = "❌";
const successEmoji = "✅";
const infoEmoji = "ℹ️";
const extensionsFolder = path.join("..", "..", "extensions");

main();

function main() {
  const extensions = getExtensions();
  validateManifests(extensions);
}

function getExtensions() {
  const extensions = [];
  for (const folder of fs.readdirSync(extensionsFolder)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(extensionsFolder, folder, "package.json")));
    extensions.push({
      name: folder,
      iconPath: path.join(extensionsFolder, folder, "assets", manifest.icon),
      manifest,
    });
  }
  return extensions;
}

function validateManifests(extensions) {
  console.log(infoEmoji, "Validating manifests\n");
  const requiredFields = [
    { name: "name", emptyValue: "" },
    { name: "title", emptyValue: "" },
    { name: "description", emptyValue: "" },
    { name: "icon", emptyValue: "" },
    { name: "author", emptyValue: "" },
    { name: "license", emptyValue: "" },
    { name: "dependencies", emptyValue: {} },
  ];
  for (const extension of extensions) {
    let hasProblems = false;

    // Checking to make sure required fields exist and isn't empty
    for (const requiredField of requiredFields) {
      const fieldValue = extension.manifest[requiredField.name];
      if (fieldValue === undefined) {
        console.log(errorEmoji, `Missing ${requiredField.name} field for extension \"${extension.name}\"`);
        hasProblems = true;
      }
      if (fieldValue === requiredField.emptyValue) {
        console.log(errorEmoji, `${requiredField.name} is empty for extension \"${extension.name}\"`);
        hasProblems = true;
      }
    }

    // Icon dimensions and type
    const darkModeVersion = extension.iconPath.replace("@light", "@dark");
    const icons = [extension.iconPath, fs.existsSync(darkModeVersion) ? darkModeVersion : null];
    for (const icon of icons) {
      if (!fs.existsSync(icon)) {
        console.log(errorEmoji, `Icon listed in manifest (package.json) for \"${extension.name}\" doesn't exist`);
        hasProblems = true;
      }
      const iconDimensions = sizeOf(icon);
      if (iconDimensions.height !== 512 || iconDimensions.width !== 512) {
        console.log(errorEmoji, `Icon isn't the correct dimensions \"${extension.name}\" (should be 512x512)`);
        hasProblems = true;
      }
      if (iconDimensions.type !== "png") {
        console.log(errorEmoji, `Icon isn't a png for \"${extension.name}\"`);
        hasProblems = true;
      }
    }

    // License
    const requiredLicense = "MIT";
    if (extension.manifest.license !== requiredLicense) {
      console.log(
        errorEmoji,
        `license field is not \"${requiredLicense}\" in manifest (package.json) for \"${extension.name}\"`
      );
      hasProblems = true;
    }

    // Dependencies
    const raycastAPIDependency = "@raycast/api";
    if (!Object.keys(extension.manifest.dependencies).includes(raycastAPIDependency)) {
      console.log(
        errorEmoji,
        `Missing raycast api dependency (\"${raycastAPIDependency}\") in manifest (package.json) for \"${extension.name}\"`
      );
      hasProblems = true;
    }

    if (hasProblems) {
      console.log();
      console.log(errorEmoji, "See problems listed above");
      process.exit(1);
    }
  }
  console.log(successEmoji, "Validated manifests");
}
