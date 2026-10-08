#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { cp } from "fs/promises";
import ora from "ora";
import { join } from "path";
import { cwd } from "process";
import tildify from "tildify";
import untildify from "untildify";
import { name, version } from "./package.json";

const command = new Command(name)
  .version(version)
  .requiredOption(
    "-t, --template <template-name>",
    "the template to use, can be an official template name or a path to a local template directory"
  )
  .option(
    "-o, --output <output-dir>",
    "the output directory where the extension will be created"
  )
  .parse(process.argv);

async function run() {
  // Read the template name
  let templateDir: string = command.getOptionValue("template").trim();
  let repo = "raycast/extensions";

  // TODO: support github enterprise / gitlab / bitbucket urls?
  const match = templateDir.match("github.com/([^/]*/[^/]*)(/(.*))?");

  if (match) {
    repo = match[1];
    // Allow users to open template directory and copy it from browser – remove `tree/branch-name` from this URL
    templateDir = (match[3] || "").replace(/tree\/[^/]+/, "");
  } else {
    templateDir = `templates/${templateDir}`;
  }

  const templatesRepoPath = `/tmp/raycast-templates-${repo.replace("/", "-")}`;

  // Clone the templates repo if it doesn't exist
  let spinner = ora({
    text: "Fetching templates...",
  });

  spinner.start();

  if (existsSync(templatesRepoPath)) {
    await execa(
      `cd ${templatesRepoPath} && git pull origin main --rebase --quiet`,
      { shell: true }
    );
  } else {
    await execa(
      `git clone https://github.com/raycast/extensions ${templatesRepoPath} --quiet --filter=blob:none --no-checkout && cd ${templatesRepoPath} && git sparse-checkout set templates && git checkout main --quiet`,
      { shell: true }
    );
  }

  spinner.stop();

  if (existsSync(`${templatesRepoPath}/${templateDir}`)) {
    templateDir = `${templatesRepoPath}/${templateDir}`;
  } else {
    console.log(
      chalk.red(
        `The template does not exist. Check available templates at "https://raycast.com/templates".`
      )
    );
    process.exit(1);
  }

  const templatePackageJson = join(templateDir, "package.json");
  if (!existsSync(templatePackageJson)) {
    console.log(
      chalk.red(
        `The template ${templateDir} does not contain a "package.json" file.`
      )
    );
    process.exit(1);
  }

  // Create the extension directory
  const contents = readFileSync(templatePackageJson, "utf-8");
  const packagJson = JSON.parse(contents) as { name: string };
  const templateName = packagJson.name;
  const outputDir: string = untildify(
    command.getOptionValue("output") || join(cwd(), templateName)
  );

  if (existsSync(outputDir)) {
    console.log(
      chalk.red(
        `"${outputDir}" already exists. Please try again a different directory or delete the current one.`
      )
    );
    process.exit(1);
  } else {
    mkdirSync(outputDir, { recursive: true });
  }

  // Copy the template files
  spinner = ora({
    text: "Copying files...",
  });

  spinner.start();

  await cp(templateDir, outputDir, { recursive: true });

  spinner.stop();

  // Install the dependencies
  spinner = ora({
    text: "Installing dependencies...",
  });
  spinner.start();

  await execa(`cd ${outputDir} && npm install`, { shell: true });

  spinner.stop();

  // End with a nice message
  const prettifiedOutputDir = tildify(outputDir);
  console.log(chalk.green(`Created extension at ${prettifiedOutputDir}`));
  console.log();
  console.log(
    "Run the command below to start the extension in development mode:"
  );
  console.log(chalk.cyan(`  cd ${prettifiedOutputDir} && npx ray dev`));
  console.log();
}

run().catch((error) => {
  console.log(chalk.red("Failed creating Raycast extension"));
  console.log(chalk.red(error.message));
  console.log();

  process.exit(1);
});
