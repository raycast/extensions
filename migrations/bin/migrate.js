#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const semver = require("semver");
const { exec } = require("child_process");
const os = require("os");

const jscodeshift = require
  .resolve("jscodeshift")
  .replace(/index\.js$/, "bin/jscodeshift.js");

const migrationToolFolder = path.dirname(__dirname);

// Cross-platform helpers
const isWindows = os.platform() === "win32";

/**
 * Find files with specific extensions, cross-platform
 */
function findFiles(directory, extensions, excludePaths = ["node_modules"]) {
  const files = [];

  function searchDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded paths
        if (!excludePaths.some((excluded) => fullPath.includes(excluded))) {
          searchDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  searchDir(directory);
  return files;
}

/**
 * Execute shell script cross-platform
 */
function executeShellScript(scriptPath, cwd) {
  // On Windows, look for PowerShell script first
  if (isWindows) {
    const ps1Path = scriptPath.replace(/\.sh$/, ".ps1");
    if (fs.existsSync(ps1Path)) {
      const command = `powershell -ExecutionPolicy Bypass -File "${ps1Path}"`;
      return new Promise((resolve, reject) => {
        const stream = exec(command, { cwd }, (err, stdout, stderr) => {
          if (err) {
            reject(stderr || err.message);
          } else {
            resolve();
          }
        });

        stream.stdout.pipe(process.stdout);
      });
    }
  }

  // Fallback to bash (works in Git Bash on Windows)
  const command = isWindows
    ? `bash "${scriptPath}"` // Git Bash should be available
    : `bash "${scriptPath}"`;

  return new Promise((resolve, reject) => {
    const stream = exec(command, { cwd }, (err, stdout, stderr) => {
      if (err) {
        reject(stderr || err.message);
      } else {
        resolve();
      }
    });

    stream.stdout.pipe(process.stdout);
  });
}
/**
 * Get the correct executable path for ray cli
 */
function getRayExecutable(extensionPath) {
  const binPath = path.join(extensionPath, "node_modules", ".bin");
  if (isWindows) {
    const cmdPath = path.join(binPath, "ray.cmd");
    const exePath = path.join(binPath, "ray.exe");
    if (fs.existsSync(cmdPath)) return cmdPath;
    if (fs.existsSync(exePath)) return exePath;
    return "ray"; // fallback to global
  } else {
    const unixPath = path.join(binPath, "ray");
    if (fs.existsSync(unixPath)) return unixPath;
    return "ray"; // fallback to global
  }
}

// Get all the migration folders and sort them
const migrations = fs
  .readdirSync(migrationToolFolder)
  .filter((x) => x.match(/^[0-9]+\.[0-9]+\.[0-9]+$/g))
  .sort((a, b) => (semver.gt(a, b) ? 1 : -1));

const [, , _extensionPath] = process.argv;

if (!_extensionPath) {
  console.error("❌ Missing path to the extension");
  process.exit(1);
}

const extensionPath = path.resolve(_extensionPath);

if (
  !fs.existsSync(extensionPath) ||
  !fs.existsSync(path.join(extensionPath, "package.json"))
) {
  console.error(`❌ Cannot find extension at "${extensionPath}"`);
  process.exit(1);
}

if (!fs.existsSync(path.join(extensionPath, "package-lock.json"))) {
  console.error(`❌ Cannot determine the current @raycast/api version`);
  process.exit(1);
}

const packageJSON = require(path.join(extensionPath, "package.json"));
const packageLockJSON = require(path.join(extensionPath, "package-lock.json"));

const currentVersion = packageLockJSON.packages["node_modules/@raycast/api"];

if (!currentVersion) {
  console.error(`❌ Seems like this package doesn't depend on @raycast/api`);
  process.exit(1);
}

console.log(
  `💡 Found the current version of @raycast/api: ${currentVersion.version}`
);

const migrationsToApply = migrations.filter((x) =>
  semver.gt(x, currentVersion.version)
);

const realMigrations = migrationsToApply.filter((x) => {
  const migrationDir = path.join(migrationToolFolder, x);
  return (
    fs.existsSync(path.join(migrationDir, "index.ts")) ||
    fs.existsSync(path.join(migrationDir, "command.sh")) ||
    (isWindows && fs.existsSync(path.join(migrationDir, "command.ps1")))
  );
});

if (migrationsToApply.length === 0) {
  console.log(`✅ There are no migrations to apply`);
  process.exit(0);
}

console.log(
  `⤴️  There ${realMigrations.length > 1 ? "are" : "is"} ${
    realMigrations.length
  } migration${realMigrations.length > 1 ? "s" : ""} to apply:`
);

realMigrations.forEach((x) => console.log(`  - ${x}`));

console.log("");
console.log("-----------------------");
console.log("");
console.log("🎭 Updating the @raycast/api version in the package.json...");
console.log("");

packageJSON.dependencies["@raycast/api"] = `^${
  migrationsToApply[migrationsToApply.length - 1]
}`;

fs.writeFileSync(
  path.join(extensionPath, "package.json"),
  `${JSON.stringify(packageJSON, null, "  ")}\n`,
  "utf8"
);

new Promise((resolve, reject) => {
  let stream = exec(
    `npm install`,
    { cwd: extensionPath },
    (err, stdout, stderr) => {
      if (err) {
        reject(stderr);
      } else {
        resolve();
      }
    }
  );

  stream.stdout.pipe(process.stdout);
})
  .then(() => {
    return realMigrations.reduce((p, migration) => {
      return p.then(() => {
        console.log("");
        console.log("-----------------------");
        console.log("");
        console.log(`🚀 Applying the migration to ${migration}...`);
        console.log("");

        return Promise.all([
          fs.existsSync(path.join(migrationToolFolder, migration, "index.ts"))
            ? new Promise((resolve, reject) => {
                const sourceFiles = findFiles(extensionPath, [
                  "js",
                  "jsx",
                  "ts",
                  "tsx",
                ]);
                if (sourceFiles.length === 0) {
                  resolve();
                  return;
                }

                const filesArg = sourceFiles.map((f) => `"${f}"`).join(" ");
                const command = `"${jscodeshift}" --verbose=2 --extensions=tsx,ts,jsx,js --parser=tsx -t ./${migration}/index.ts ${filesArg}`;

                let stream = exec(
                  command,
                  { cwd: migrationToolFolder },
                  (err, stdout, stderr) => {
                    if (err) {
                      reject(stderr);
                    } else {
                      resolve();
                    }
                  }
                );

                stream.stdout.pipe(process.stdout);
              })
            : Promise.resolve(),
          fs.existsSync(path.join(migrationToolFolder, migration, "json.ts"))
            ? new Promise((resolve, reject) => {
                const jsonFiles = findFiles(extensionPath, ["json"]);
                if (jsonFiles.length === 0) {
                  resolve();
                  return;
                }

                const filesArg = jsonFiles.map((f) => `"${f}"`).join(" ");
                const command = `"${jscodeshift}" --verbose=2 --extensions=tsx,ts,jsx,js --parser=tsx -t ./${migration}/json.ts ${filesArg}`;

                let stream = exec(
                  command,
                  { cwd: migrationToolFolder },
                  (err, stdout, stderr) => {
                    if (err) {
                      reject(stderr);
                    } else {
                      resolve();
                    }
                  }
                );

                stream.stdout.pipe(process.stdout);
              })
            : Promise.resolve(),
          fs.existsSync(
            path.join(migrationToolFolder, migration, "command.sh")
          ) ||
          (isWindows &&
            fs.existsSync(
              path.join(migrationToolFolder, migration, "command.ps1")
            ))
            ? executeShellScript(
                path.join(migrationToolFolder, migration, "command.sh"),
                extensionPath
              )
            : Promise.resolve(),
        ]);
      });
    }, Promise.resolve());
  })
  .then(() => {
    console.log("");
    console.log("-----------------------");
    console.log("");
    console.log(`✅ All migrations applied!`);
    console.log("");
    console.log(`🧹 Cleaning up...`);

    return new Promise((resolve, reject) => {
      const rayExecutable = getRayExecutable(extensionPath);
      let stream = exec(
        `"${rayExecutable}" lint --fix`,
        { cwd: extensionPath },
        (err, stdout, stderr) => {
          if (err) {
            reject(stderr);
          } else {
            resolve();
          }
        }
      );

      stream.stdout.pipe(process.stdout);
    });
  })
  .then(() => {
    console.log("");
    console.log("-----------------------");
    console.log("");
    console.log(
      `🎉 All done! Please double-check that there are no issue, we all know that those robots don't really understand what they are doing.`
    );
  })
  .catch((err) => {
    console.error(`❌ ${err}`);
    process.exit(1);
  });
