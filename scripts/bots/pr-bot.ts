import { context as Context, getOctokit } from "@actions/github";
import * as Core from "@actions/core";
import { PullRequestEvent } from "@octokit/webhooks-types";

type API = {
  github: ReturnType<typeof getOctokit>;
  context: typeof Context & {
    payload: PullRequestEvent;
  };
  core: typeof Core;
};

export default async ({ github, context }: API) => {
  const assignReadyForReviewTo = "pernielsentikaer";

  if (context.payload.action === "ready_for_review" && !context.payload.pull_request.draft) {
    try {
      await github.rest.issues.addAssignees({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        assignees: [assignReadyForReviewTo]
      });
      console.log(`Successfully assigned PR to ${assignReadyForReviewTo}`);
    } catch (error) {
      console.error(`Failed to assign PR to ${assignReadyForReviewTo}:`, error);
    }
  }

  console.log("changed extensions", process.env.CHANGED_EXTENSIONS);

  if (!process.env.CHANGED_EXTENSIONS) {
    console.log("No changed extensions");
    return;
  }
  const touchedExtensions = new Set(
    process.env.CHANGED_EXTENSIONS?.split(",")
      .map((x) => x.split("extensions/").filter(Boolean)[1])
      .map((x) => x.split("/")[0])
  );
  console.log("changed extensions", touchedExtensions);

  if (touchedExtensions.size > 1) {
    console.log("We only notify people when updating a single extension");
    return;
  }

  // You can expect an initial review within five business days.
  const expectations = "Due to our current reduced availability during summer, the initial review may take up to 10-15 business days.";

  const codeowners = await getCodeOwners({ github, context });

  const sender = context.payload.sender.login;

  if (sender === "raycastbot") {
    console.log("We don't notify people when raycastbot is doing its stuff (usually merging the PR)");
    return;
  }

  const opts = github.rest.issues.listForRepo.endpoint.merge({
    ...context.issue,
    creator: sender,
    state: "all",
  });
  const issues = await github.paginate<{
    owner: string;
    repo: string;
    number: number;
    pull_request: boolean;
  }>(opts);

  const isFirstContribution = issues.every((issue) => issue.number === context.issue.number || !issue.pull_request);

  for (const extensionFolder of touchedExtensions) {
    const owners = codeowners[`/extensions/${extensionFolder}`];

    let aiFilesOrToolsExist = false;

    if (!owners) {
      // it's a new extension
      console.log(`cannot find existing extension ${extensionFolder}`);

      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["new extension"],
      });

      // because it's a new extension, let's check for AI stuff in the PR diff
      aiFilesOrToolsExist = await checkForAiInPullRequestDiff(extensionFolder, { github, context });

      if (aiFilesOrToolsExist) {
        console.log(`adding AI Extension label because ai files or tools exist for ${extensionFolder}`);

        await github.rest.issues.addLabels({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          labels: ["AI Extension"],
        });
      }

      // `Congratulations on your new Raycast extension! :rocket:\n\nWe will aim to make the initial review within five working days. Once the PR is approved and merged, the extension will be available on our Store.`
      await comment({
        github,
        context,
        comment: `Congratulations on your new Raycast extension! :rocket:\n\n${expectations}\n\nOnce the PR is approved and merged, the extension will be available on our Store.`,
      });
      return;
    }

    await github.rest.issues.addLabels({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      labels: ["extension fix / improvement", await extensionLabel(extensionFolder, { github, context })],
    });

    // Check package.json tools first
    try {
      const packageJson = await getGitHubFile(`extensions/${extensionFolder}/package.json`, { github, context });
      const packageJsonObj = JSON.parse(packageJson);

      aiFilesOrToolsExist = !!packageJsonObj.tools;
    } catch {
      console.log(`No package.json tools for ${extensionFolder}`);
    }

    // Only check AI files if no tools found in package.json
    if (!aiFilesOrToolsExist) {
      try {
        await getGitHubFile(`extensions/${extensionFolder}/ai.json`, { github, context });

        aiFilesOrToolsExist = true;
      } catch {
        console.log(`No ai.json for ${extensionFolder}`);
      }

      try {
        await getGitHubFile(`extensions/${extensionFolder}/ai.yaml`, { github, context });

        aiFilesOrToolsExist = true;
      } catch {
        console.log(`No ai.yaml for ${extensionFolder}`);
      }

      try {
        await getGitHubFile(`extensions/${extensionFolder}/ai.json5`, { github, context });

        aiFilesOrToolsExist = true;
      } catch {
        console.log(`No ai.json5 for ${extensionFolder}`);
      }
    }

    if (!aiFilesOrToolsExist) {
      // If we didn't find any AI files or tools in the package.json, let's check the PR diff
      aiFilesOrToolsExist = await checkForAiInPullRequestDiff(extensionFolder, { github, context });
    }

    if (aiFilesOrToolsExist) {
      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["AI Extension"],
      });
    }

    if (!owners.length) {
      console.log("no maintainer for this extension");
      await comment({
        github,
        context,
        comment: `Thank you for your ${isFirstContribution ? "first " : ""} contribution! :tada:

This is especially helpful since there were no maintainers for this extension :pray:\n\n${expectations}`,
      });
    }

    if (owners[0] === sender) {
      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["OP is author"],
      });

      await comment({
        github,
        context,
        comment: `Thank you for the update! :tada:\n\n${expectations}`,
      });
      return;
    }

    if (owners.indexOf(sender) !== -1) {
      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["OP is contributor"],
      });
    }

    await comment({
      github,
      context,
      comment: `Thank you for your ${isFirstContribution ? "first " : ""} contribution! :tada:

🔔 ${[...new Set(owners.filter((x) => x !== sender))]
        .map((x) => `@${x}`)
        .join(" ")} you might want to have a look.\n\nYou can use [this guide](https://developers.raycast.com/basics/review-pullrequest) to learn how to check out the Pull Request locally in order to test it.\n\n${expectations}`,
    });

    return;
  }
};

async function getCodeOwners({ github, context }: Pick<API, "github" | "context">) {
  const codeowners = await getGitHubFile(".github/CODEOWNERS", { github, context });

  const regex = /(\/extensions\/[\w-]+) +(.*)/g;
  const matches = codeowners.matchAll(regex);

  return Array.from(matches).reduce<{ [key: string]: string[] }>((prev, match) => {
    prev[match[1]] = match[2]
      .split(" ")
      .map((x) => x.replace(/^@/, ""))
      .filter((x) => !!x);
    return prev;
  }, {});
}

async function getExtensionName2Folder({ github, context }: Pick<API, "github" | "context">) {
  const file = await getGitHubFile(".github/extensionName2Folder.json", { github, context });
  return JSON.parse(file) as { [key: string]: string };
}

async function getGitHubFile(path: string, { github, context }: Pick<API, "github" | "context">) {
  const { data } = await github.rest.repos.getContent({
    mediaType: {
      format: "raw",
    },
    owner: context.repo.owner,
    repo: context.repo.repo,
    path,
  });

  // @ts-ignore
  return data as string;
}

async function checkForAiInPullRequestDiff(extensionFolder: string, { github, context }: Pick<API, "github" | "context">) {
  const { data: files } = await github.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  });

  let aiFilesOrToolsExist: boolean = false;

  for (const file of files) {
    const filePath = file.filename;

    // we only care about files in the extension folder
    if (!filePath.startsWith(`extensions/${extensionFolder}/`)) {
      continue;
    }

    if (filePath === `extensions/${extensionFolder}/package.json`) {
      try {
        // because it's a new extension, we need to get the content from the PR itself
        if (file.status === 'added' || file.status === 'modified') {
          const { data: content } = await github.rest.repos.getContent({
            mediaType: {
              format: "raw",
            },
            owner: context.repo.owner,
            repo: context.repo.repo,
            path: filePath,
            ref: context.payload.pull_request.head.sha,
          });

          const packageJsonObj = JSON.parse(content as unknown as string);

          aiFilesOrToolsExist = !!packageJsonObj.tools;
        }
      } catch {
        console.log(`Could not parse package.json for ${extensionFolder}`);
      }
    }

    if (file.status === 'added' || file.status === 'modified') {
      const aiFiles = ['ai.json', 'ai.yaml', 'ai.json5'];

      if (aiFiles.some(filename => filePath === `extensions/${extensionFolder}/${filename}`)) {
        aiFilesOrToolsExist = true;
      }
    }
  }

  return aiFilesOrToolsExist;
}

// Create a new comment or update the existing one
async function comment({ github, context, comment }: Pick<API, "github" | "context"> & { comment: string }) {
  // Get the existing comments on the PR
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  });

  // Find any comment already made by the bot
  const botComment = comments.find((comment) => comment.user?.login === "raycastbot");

  if (botComment) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: botComment.id,
      body: comment,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: comment,
    });
  }
}

async function extensionLabel(extensionFolder: string, api: Pick<API, "github" | "context">) {
  const extensionName2Folder = await getExtensionName2Folder(api);

  const extension = Object.values(extensionName2Folder).find(([name, folder]) => folder === extensionFolder)?.[0];

  let label;

  if (extension) {
    const names = Object.keys(extensionName2Folder).map((x) => x.split("/")[1]);
    const multipleExtensionsWithTheSameName = names.filter((x) => x === extension).length > 1;
    label = `extension: ${multipleExtensionsWithTheSameName ? extension : extension?.split("/")[1]}`;
  } else {
    label = `extension: ${extensionFolder}`;
  }

  return label.length > 50 ? label.substring(0, 49) + "…" : label;
}
