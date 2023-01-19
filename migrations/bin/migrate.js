#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const semver = require("semver");
const { exec } = require("child_process");

const jscodeshift = require
  .resolve("jscodeshift")
  .replace(/index\.js$/, "bin/jscodeshift.js");

const migrationToolFolder = path.dirname(__dirname);

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

const realMigrations = migrationsToApply.filter(
  (x) =>
    fs.existsSync(path.join(migrationToolFolder, x, "index.ts")) ||
    fs.existsSync(path.join(migrationToolFolder, x, "command.sh"))
);

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
                let stream = exec(
                  `find "${extensionPath}" \\( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \\) -not -path "*/node_modules/*" | xargs "${jscodeshift}" --verbose=2 --extensions=tsx,ts,jsx,js --parser=tsx -t ./${migration}/index.ts`,
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
          fs.existsSync(path.join(migrationToolFolder, migration, "command.sh"))
            ? new Promise((resolve, reject) => {
                let stream = exec(
                  `bash "${path.join(
                    migrationToolFolder,
                    migration,
                    "command.sh"
                  )}"`,
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
      let stream = exec(
        `./node_modules/.bin/ray lint --fix`,
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
