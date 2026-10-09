const { execSync } = require("child_process");
const { existsSync, readdirSync, readFileSync } = require("fs");
const { join, dirname } = require("path");
const semver = require("semver");

const dependencyToAudit = "esbuild";
const versionRange = ">= 0.27.3 < 0.28.1";

if (!semver.validRange(versionRange)) {
  console.error(`Invalid version range: ${versionRange}`);
  process.exit(1);
}

const extensionsDir = join(__dirname, "..", "..", "extensions");
const failed = [];
for (const ext of readdirSync(extensionsDir)) {
  const extDir = join(extensionsDir, ext);
  const packageLock = join(extDir, "package-lock.json");
  if (!existsSync(packageLock)) {
    continue;
  }
  // console.log(`Checking ${ext}...`);
  const content = readFileSync(packageLock, "utf8").toLowerCase();
  if (!content.includes(`node_modules/${dependencyToAudit}":`)) {
    continue;
  }
  const regex = new RegExp(`node_modules/${dependencyToAudit}":\\s*{[^}]*"version":\\s*"([^"]+)"`, "gi");

  while ((version = regex.exec(content)) !== null) {
    if (semver.satisfies(semver.coerce(version[1]), versionRange)) {
      console.log(`- Found ${dependencyToAudit}@${version[1]} in extensions/${ext}, running npm audit...`);
      try {
        try {
          execSync("npm audit fix", { cwd: extDir, encoding: "utf-8", stdio: "inherit" });
        } catch {
          // npm's arborist has a bug resolving some peer dependency sets that crashes with
          // "Cannot read properties of null (reading 'edgesOut')"; --legacy-peer-deps avoids it
          execSync("npm audit fix --legacy-peer-deps", { cwd: extDir, encoding: "utf-8", stdio: "inherit" });
        }
      } catch (err) {
        failed.push(ext);
        console.error(`Error running npm audit fix in ${ext}:`, err.message);
      } finally {
        execSync("rm -rf ./node_modules", { cwd: extDir, encoding: "utf-8", stdio: "inherit" });
      }
      break;
    }
  }
}

if (failed.length > 0) {
  console.log("\n\nThe following extensions failed npm audit fix:");
  failed.forEach((ext) => {
    console.log(`- ${ext}`);
  });
  process.exit(1);
}
