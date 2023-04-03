const fs = require("fs");
const path = require("path");

const newMatch = /### Extension\s*https:\/\/(?:www\.)?raycast\.com\/[^\/]+\/([^\/\s]+)/;
const newMatchGitHub =
  /### Extension\s*https:\/\/(?:www\.)?github\.com\/raycast\/extensions\/[^\s]*extensions\/([^\/\s]+)/;
const oldMatch =
  /# Extension – \[[^\]]*\]\(https:\/\/(?:www\.)?github\.com\/raycast\/extensions\/[^\s]*extensions\/([^\/\s]+)\/\)/;

const closeIssueMatch = /@raycastbot close this issue/;

module.exports = async ({ github, context, core }) => {
  const sender = context.payload.sender.login;

  if (sender === "raycastbot" || sender === "stale") {
    console.log("We don't notify people when the bots are doing their stuff");
    return;
  }

  if (context.payload.issue.labels.every((x) => x.name !== "extension")) {
    console.log("We only deal with extension issues");
    return;
  }

  const codeowners = await getCodeOwners({ github, context });

  const [, ext] =
    newMatch.exec(context.payload.issue.body) ||
    newMatchGitHub.exec(context.payload.issue.body) ||
    oldMatch.exec(context.payload.issue.body) ||
    [];

  if (!ext) {
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

  const owners =
    codeowners[`/extensions/${ext}`] ||
    // some extensions don't have a folder that match their name
    codeowners[`/extensions/${(await getExtensionName2Folder({ github, context }))[ext]}`];

  if (!owners) {
    console.log(`could not find the extension ${ext}`);
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
    if (
      context.payload.comment.user &&
      (owners.indexOf(context.payload.comment.user.login) !== -1 ||
        // also allow the OP to close the issue that way
        context.payload.comment.user.login === context.payload.issue.user.login)
    ) {
      if (closeIssueMatch.test(context.payload.comment.body)) {
        console.log(`closing #${context.payload.issue.number}`);
        await github.rest.issues.update({
          issue_number: context.payload.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          state: "closed",
        });
      } else {
        console.log(`didn't find the right comment`);
      }
    } else {
      console.log(`${context.payload.comment.user.login} is not an owner`);
    }
    return;
  }

  await github.rest.issues.addLabels({
    issue_number: context.payload.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    labels: [limitLabelLength(`extension: ${ext}`)],
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

  const toNotify = owners.filter((x) => x !== sender);

  if (!toNotify.length) {
    console.log("no one to notify, skipping comment");
    return;
  }

  console.log("Sending welcome message");

  await comment({
    github,
    context,
    comment: `Thank you for opening this issue!\n\n🔔 ${toNotify
      .map((x) => `@${x}`)
      .join(
        " "
      )} you might want to have a look.\n\n💡 Tip: Once the issue is resolved, comment \`@raycastbot close this issue\` to close it.`,
  });
};

async function getCodeOwners({ github, context }) {
  const codeowners = await getGitHubFile(".github/CODEOWNERS", { github, context });

  const regex = /(\/extensions\/[\w-]+) +(.+)/g;
  const matches = codeowners.matchAll(regex);

  return Array.from(matches).reduce((prev, match) => {
    prev[match[1]] = match[2].split(" ").map((x) => x.replace(/^@/, ""));
    return prev;
  }, {});
}

async function getExtensionName2Folder({ github, context }) {
  const file = await getGitHubFile(".github/extensionName2Folder.json", { github, context });
  return JSON.parse(file);
}

async function getGitHubFile(path, { github, context }) {
  const { data } = await github.rest.repos.getContent({
    mediaType: {
      format: "raw",
    },
    owner: context.repo.owner,
    repo: context.repo.repo,
    path,
  });

  return Buffer.from(data.content, "base64").toString("utf8");
}

// Create a new comment or update the existing one
async function comment({ github, context, comment }) {
  // Get the existing comments on the PR
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  });

  // Find any comment already made by the bot
  const botComment = comments.find((comment) => comment.user.login === "raycastbot");

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

function limitLabelLength(label) {
  return label.length > 50 ? label.substring(0, 49) + "…" : label;
}
