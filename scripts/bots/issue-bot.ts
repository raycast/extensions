import { context as Context, getOctokit } from "@actions/github";
import * as Core from "@actions/core";
import {
  IssuesOpenedEvent,
  IssuesEditedEvent,
  IssueCommentCreatedEvent,
  IssueCommentEditedEvent,
} from "@octokit/webhooks-types";

type API = {
  github: ReturnType<typeof getOctokit>;
  context: typeof Context & {
    payload: IssuesOpenedEvent | IssuesEditedEvent | IssueCommentEditedEvent | IssueCommentCreatedEvent;
  };
  core: typeof Core;
};

const newMatch = /### Extension\s*https:\/\/(?:www\.)?raycast\.com\/([^\/]+)\/([^\/\s]+)/;
const newMatchGitHub =
  /### Extension\s*https:\/\/(?:www\.)?github\.com\/raycast\/extensions\/[^\s]*extensions\/([^\/\s]+)/;
const oldMatchGithub =
  /# Extension – \[[^\]]*\]\(https:\/\/(?:www\.)?github\.com\/raycast\/extensions\/[^\s]*extensions\/([^\/\s]+)\/\)/;

const closeIssueMatch = /@raycastbot close this issue/;
const closeIssueAsNotPlannedMatch = /@raycastbot close as not planned/;
const reopenIssueMatch = /@raycastbot reopen this issue/;
const renameIssueMatch = /@raycastbot rename this issue to "(.+)"/;
const assignMeMatch = /@raycastbot assign me/;
const goodFirstIssueMatch = /@raycastbot good first issue/;
const keepIssueOpenMatch = /@raycastbot keep this issue open/;

export default async ({ github, context }: API) => {
  const sender = context.payload.sender.login;

  if (sender === "raycastbot" || sender === "stale") {
    console.log("We don't notify people when the bots are doing their stuff");
    return;
  }

  if (!context.payload.issue.labels || context.payload.issue.labels.every((x) => x.name !== "extension")) {
    console.log("We only deal with extension issues");
    return;
  }

  let owners;
  let extension;
  let extensionFolder: string;

  const [codeowners, extensionName2Folder] = await Promise.all([
    getCodeOwners({ github, context }),
    getExtensionName2Folder({ github, context }),
  ]);

  if (newMatch.test(context.payload.issue.body)) {
    const [, owner, ext] = newMatch.exec(context.payload.issue.body) || [];

    extension = `${owner}/${ext}`;
    extensionFolder = extensionName2Folder[extension];
    owners = codeowners[`/extensions/${extensionFolder}`];
  } else {
    const [, x] =
      newMatchGitHub.exec(context.payload.issue.body) || oldMatchGithub.exec(context.payload.issue.body) || [];
    extensionFolder = x;

    extension = Object.values(extensionName2Folder).find(([_, folder]) => folder === extensionFolder)?.[0];

    if (!extension) {
      console.log(`could not find the extension in the body`);
      await comment({
        github,
        context,
        comment: `We could not find the extension related to this issue. Please update the issue with the link to the extension.`,
      });
      await github.rest.issues.addLabels({
        issue_number: context.payload.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["status: stalled"],
      });
      return;
    }

    owners = codeowners[`/extensions/${extensionFolder}`];
  }

  if (!owners) {
    console.log(`could not find the code owners for ${extension} (folder: ${extensionFolder})`);
    await comment({
      github,
      context,
      comment: `We could not find the extension related to this issue. Please update the issue with the correct link to the extension.`,
    });
    await github.rest.issues.addLabels({
      issue_number: context.payload.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      labels: ["status: stalled"],
    });
    return;
  }

  if (context.payload.comment) {
    // we don't want to label the issue here, only answer to a comment

    // if the one who posts a comment is an owner of the extension related to the issue
    if (context.payload.comment.user && owners.indexOf(context.payload.comment.user.login) !== -1) {
      if (closeIssueMatch.test(context.payload.comment.body)) {
        console.log(`closing #${context.payload.issue.number}`);
        await github.rest.issues.update({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          state: "closed",
        });
      } else if (closeIssueAsNotPlannedMatch.test(context.payload.comment.body)) {
        console.log(`closing #${context.payload.issue.number} as not planned`);
        await github.rest.issues.update({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          state: "closed",
          state_reason: "not_planned",
        });
      } else if (reopenIssueMatch.test(context.payload.comment.body)) {
        console.log(`reopening #${context.payload.issue.number}`);
        await github.rest.issues.update({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          state: "open",
        });
      } else if (renameIssueMatch.test(context.payload.comment.body)) {
        console.log(`renaming #${context.payload.issue.number}`);
        const [, title] = renameIssueMatch.exec(context.payload.comment.body) || [];
        await github.rest.issues.update({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          title,
        });
      } else if (assignMeMatch.test(context.payload.comment.body)) {
        console.log(`assigning #${context.payload.issue.number} to ${context.payload.comment.user.login}`);
        await github.rest.issues.addAssignees({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          assignees: [context.payload.comment.user.login],
        });
      } else if (goodFirstIssueMatch.test(context.payload.comment.body)) {
        console.log(`Adding the "Good first issue" label to #${context.payload.issue.number}`);
        await github.rest.issues.addLabels({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          labels: ["Good first issue"],
        });
      } else if (keepIssueOpenMatch.test(context.payload.comment.body)) {
        console.log(`Adding the "Dont close" label to #${context.payload.issue.number}`);
        await github.rest.issues.addLabels({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          labels: ["Dont close"],
        });
      } else {
        console.log(`didn't find the right comment`);
      }
    } else if (
      // also allow the OP to close the issue that way
      context.payload.comment.user &&
      context.payload.comment.user.login === context.payload.issue.user.login &&
      closeIssueMatch.test(context.payload.comment.body)
    ) {
      console.log(`closing #${context.payload.issue.number}`);
      await github.rest.issues.update({
        issue_number: context.payload.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: "closed",
      });
    } else {
      console.log(`${context.payload.comment.user.login} is not an owner`);
    }
    return;
  }

  await github.rest.issues.addLabels({
    issue_number: context.payload.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    labels: [extensionLabel(extension, extensionName2Folder)],
  });

  try {
    await github.rest.issues.removeLabel({
      issue_number: context.payload.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: "status: stalled",
    });
  } catch (err) {
    // ignore, it might not be there
  }

  if (!owners.length) {
    console.log("no maintainer for this extension");
    await comment({
      github,
      context,
      comment: `Thank you for opening this issue!

Unfortunately it seems like nobody is maintaining this extension anymore. If you want to help, feel free to contribute to the extension :pray:`,
    });
  }

  const toNotify = owners.filter((x) => x !== sender);

  if (!toNotify.length) {
    console.log("no one to notify, skipping comment");
    return;
  }

  console.log("Sending welcome message");

  await comment({
    github,
    context,
    comment: `Thank you for opening this issue!

🔔 ${toNotify.map((x) => `@${x}`).join(" ")} you might want to have a look.

<details>
<summary>💡 Author and Contributors commands</summary>

The author and contributors of \`${extension}\` can trigger bot actions by commenting:

- \`@raycastbot close this issue\` Closes the issue.
- \`@raycastbot close as not planned\` Closes the issue as not planned.
- \`@raycastbot rename this issue to "Awesome new title"\` Renames the issue.
- \`@raycastbot reopen this issue\` Reopens the issue.
- \`@raycastbot assign me\` Assigns yourself to the issue.
- \`@raycastbot good first issue\` Adds the "Good first issue" label to the issue.
- \`@raycastbot keep this issue open\` Make sure the issue won't go stale and will be kept open by the bot.

</details>`,
  });
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

  return data as string;
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

function extensionLabel(extension: string, extensionName2Folder: { [key: string]: string }) {
  const names = Object.keys(extensionName2Folder).map((x) => x.split("/")[1]);
  const multipleExtensionsWithTheSameName = names.filter((x) => x === extension).length > 1;

  const label = `extension: ${multipleExtensionsWithTheSameName ? extension : extension.split("/")[1]}`;

  return label.length > 50 ? label.substring(0, 49) + "…" : label;
}
