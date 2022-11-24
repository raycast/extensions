const fs = require("fs");
const path = require("path");

const newMatch = /### Extension\s*https:\/\/www.raycast\.com\/([^\/]+)\/([^\/\s]+)/;
const oldMatch =
  /# Extension – \[([^\]]+)\]\(https:\/\/github\.com\/raycast\/extensions\/[^\s]*extensions\/([^\/\s]+)\/\)/;

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

  console.log(context.payload.issue);

  const [, , ext] = newMatch.exec(context.payload.issue.body) || oldMatch.exec(context.payload.issue.body) || [];

  if (!ext) {
    await comment({
      github,
      context,
      comment: `We could not find the extension related to this issue. Please fill update the issue with the link to the extension.`,
    });
    await github.rest.issues.addLabels({
      issue_number: context.payload.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      labels: ["status: stalled"],
    });
    return;
  }

  const owners = codeowners[`/extensions/${ext}`];

  if (!owners) {
    console.log(`cannot find existing extension ${ext}`);
    return;
  }

  await github.rest.issues.addLabels({
    issue_number: context.payload.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    labels: [`extension: ${ext}`],
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
    return;
  }

  await comment({
    github,
    context,
    comment: `Thank you for opening this issue!\n\n🔔 ${toNotify
      .map((x) => `@${x}`)
      .join(" ")} you might want to have a look.`,
  });
};

async function getCodeOwners({ github, context }) {
  const { data } = await github.rest.repos.getContent({
    mediaType: {
      format: "raw",
    },
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: ".github/CODEOWNERS",
  });

  const codeowners = Buffer.from(data.content, "base64").toString("utf8");

  const regex = /(\/extensions\/[\w-]+) +(.+)/g;
  const matches = codeowners.matchAll(regex);

  return Array.from(matches).reduce((prev, match) => {
    prev[match[1]] = match[2].split(" ").map((x) => x.replace(/^@/, ""));
    return prev;
  }, {});
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
