const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const docs = path.join(__dirname, "../generated-docs");

async function main() {
  await new Promise((resolve, reject) =>
    exec(
      `cd "${docs}" && rsync -arv ./utils-reference/.gitbook/assets/* ./.gitbook/assets && rm -rf ./utils-reference/.gitbook`,
      (err, stdout, stderr) => {
        if (err || stderr) {
          reject(err || new Error(stderr));
        } else {
          resolve(stdout.trim().split("\n")[0].split(" ")[0]);
        }
      }
    )
  );

  const summary = fs.readFileSync(path.join(docs, "SUMMARY.md"), "utf-8");
  const utilsSummary = fs.readFileSync(path.join(docs, "./utils-reference/SUMMARY.md"), "utf-8");

  fs.writeFileSync(path.join(docs, "SUMMARY.md"), summary.replace("## Misc", utilsSummary + "\n## Misc"));

  fs.unlinkSync(path.join(docs, "./utils-reference/SUMMARY.md"));
}

main();
