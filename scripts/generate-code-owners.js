#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const https = require("https");

async function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "user-agent": "cli" } }, (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", () => {
          resolve(JSON.parse(data));
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

const extensionsDir = path.join(__dirname, "../extensions");

const raycast2github = require(path.join(__dirname, `../.github/raycast2github.json`));

async function getExtensions() {
  const extensions = await fs.readdir(extensionsDir);
  return Promise.all(
    extensions.map(async (extension) => {
      try {
        const packageJSON = require(path.join(extensionsDir, `${extension}/package.json`));
        return {
          name: extension,
          author: packageJSON.author,
          contributors: packageJSON.contributors,
        };
      } catch (err) {
        console.log(`Skipping ${extension}`);
        console.log(err);
      }
    })
  );
}

async function fetchGHUsername(extension, raycastUsername) {
  if (raycastUsername === extension.author) {
    const commitHash = await new Promise((resolve, reject) =>
      exec(
        // find commit that added the package.json
        `cd "${extensionsDir}" && git log --diff-filter=A --format=format:%H -- "${extension.name}/package.json"`,
        (err, stdout, stderr) => {
          if (err || stderr) {
            reject(err || new Error(stderr));
          } else {
            resolve(stdout.trim().split("\n").reverse()[0]);
          }
        }
      )
    );

    const commit = await fetch(`https://api.github.com/repos/raycast/extensions/commits/${commitHash}`);

    if (!commit.author) {
      console.log(`[${extension.name}] can't find GH user for ${raycastUsername}`);
      return null;
    }

    return commit.author.login;
  } else {
    const package = await fs.readFile(path.join(extensionsDir, `${extension.name}/package.json`), "utf8");

    const line = package.split("\n").findIndex((l) => l.indexOf(`"${raycastUsername}"`) !== -1);
    const commitHash = await new Promise((resolve, reject) =>
      exec(
        // find commit that added the package.json
        `cd "${extensionsDir}" && git blame --porcelain  -L ${line},${line} "${extension.name}/package.json"`,
        (err, stdout, stderr) => {
          if (err || stderr) {
            reject(err || new Error(stderr));
          } else {
            resolve(stdout.trim().split("\n")[0].split(" ")[0]);
          }
        }
      )
    );

    const commit = await fetch(`https://api.github.com/repos/raycast/extensions/commits/${commitHash}`);

    if (!commit.author) {
      console.log(`[${extension.name}] can't find GH user for ${raycastUsername}`);
      return null;
    }

    return commit.author.login;
  }
}

async function formatAuthorName(extension, raycastUsername) {
  if (raycast2github[raycastUsername]) {
    return `@${raycast2github[raycastUsername]}`;
  }
  const ghUsername = await fetchGHUsername(extension, raycastUsername);
  if (!ghUsername) {
    return "";
  }
  raycast2github[raycastUsername] = ghUsername;
  return `@${ghUsername}`;
}

async function formatOwners(extension) {
  const owners = [...new Set([extension.author, ...(extension.contributors || [])])];
  return (await Promise.all(owners.map((x) => formatAuthorName(extension, x)))).filter(Boolean).join(" ");
}

async function main() {
  const extensions = await getExtensions();

  const longestExtensionNameLength = extensions.reduce(
    (max, extension) => (extension && extension.name.length > max ? extension.name.length : max),
    0
  );

  let CODEOWNERS = "# This file is generated. Do not modify directly.\n\n";
  for (const extension of extensions) {
    if (extension && extension.author) {
      CODEOWNERS += `/extensions/${extension.name}${" ".repeat(
        longestExtensionNameLength - extension.name.length + 1
      )}${await formatOwners(extension)}\n`;
    }
  }

  await fs.writeFile(path.join(__dirname, "../.github/CODEOWNERS"), CODEOWNERS, "utf-8");

  await fs.writeFile(
    path.join(__dirname, "../.github/raycast2github.json"),
    JSON.stringify(raycast2github, null, "  "),
    "utf-8"
  );
}

main();
