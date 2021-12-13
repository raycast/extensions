#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

const extensionsDir = path.join(__dirname, "../extensions");

async function getExtensions() {
  const extensions = await fs.readdir(extensionsDir);
  return extensions.map((extension) => {
    try {
      const packageJSON = require(path.join(extensionsDir, `${extension}/package.json`));
      return { name: extension, author: packageJSON.author, contributors: packageJSON.contributors };
    } catch (err) {
      console.log(`Skipping ${extension}`);
      console.log(err);
    }
  });
}

function formatAuthorName(author) {
  if (author.startsWith("@")) {
    return author;
  }
  return `@${author}`;
}

function formatOwners(extension) {
  const owners = [
    ...new Set([extension.author.toLowerCase(), ...(extension.contributors || []).map((name) => name.toLowerCase())]),
  ];
  return owners.map(formatAuthorName).join(" ");
}

async function main() {
  const extensions = await getExtensions();

  const longestExtensionNameLength = extensions.reduce(
    (max, extension) => (extension.name.length > max ? extension.name.length : max),
    0
  );

  let CODEOWNERS = "# This file is generated. Do not modify directly.\n\n";
  for (const extension of extensions) {
    if (extension && extension.author) {
      CODEOWNERS += `/extensions/${extension.name}${" ".repeat(
        longestExtensionNameLength - extension.name.length + 1
      )}${formatOwners(extension)}\n`;
    }
  }

  await fs.writeFile(path.join(__dirname, "../.github/CODEOWNERS"), CODEOWNERS, "utf-8");
}

main();
