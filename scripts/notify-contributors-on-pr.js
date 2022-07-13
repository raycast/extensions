const fs = require("fs");
const path = require("path");

module.exports = async ({ github, context, core, changedFiles }) => {
  const codeowners = getCodeOwners();

  const touchedExtensions = new Set(
    changedFiles
      .filter((x) => x.startsWith("extensions"))
      .map((x) => {
        const parts = x.split("/");
        return `/extensions/${parts[1]}`;
      })
  );

  if (touchedExtensions.size > 1) {
    console.log("We only notify people when updating a single extension");
    return;
  }

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
  const issues = await github.paginate(opts);

  const isFirstContribution = issues.every((issue) => issue.number === context.issue.number || !issue.pull_request);

  for (const ext of touchedExtensions) {
    const owners = codeowners[ext];

    if (!owners) {
      // it's a new extension
      console.log(`cannot find existing extension ${ext}`);
      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["new extension"],
      });
      await comment({
        github,
        context,
        comment: `Congratulation on your new Raycast extension! :rocket:\n\nWe will review it shortly. Once the PR is approved and merged, the extension will be available on the Store.`,
      });
      return;
    }

    await github.rest.issues.addLabels({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      labels: ["extension fix / improvement"],
    });

    if (owners[0] === sender) {
      await github.rest.issues.addLabels({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: ["OP is author"],
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
      comment: `Thank you for your ${isFirstContribution ? "first " : ""} contribution! :tada:\n\n🔔 ${owners
        .filter((x) => x !== sender)
        .map((x) => `@${x}`)
        .join(" ")} you might want to have a look.`,
    });

    return;
  }
};

function getCodeOwners() {
  const codeowners = fs.readFileSync(path.join(__dirname, "../.github/CODEOWNERS"), "utf8");

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
