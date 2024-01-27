module.exports = async ({ github, context, fetch }) => {
  try {
    const pr = (
      await github.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
      })
    ).data[0];

    if (!pr) {
      console.log("No PR found for commit " + context.sha);
      return;
    }

    const result = await (
      await fetch("https://www.raycast.com/api/v1/dev_contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Bearer " + process.env.PUBLISHING_BOT_TOKEN,
        },
        body: JSON.stringify({
          github_user_id: pr.user.id,
          credits: 1,
        }),
      })
    ).json();

    if (!result.user_id) {
      console.log("Could not find user", pr.user.login);

      await github.rest.issues.createComment({
        issue_number: pr.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `:tada: :tada: :tada:\n\nSuch a great contribution deserves a reward, but unfortunately we couldn't find your Raycast account based on your GitHub username (@${pr.user.login}).\nPlease [link your GitHub account to your Raycast account](https://www.raycast.com/settings/account) to receive your credits and soon be able to exchange them for some swag.`,
      });
    } else {
      await github.rest.issues.createComment({
        issue_number: pr.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: ":tada: :tada: :tada:\n\nWe've rewarded your Raycast account with some credits. You will soon be able to exchange them for some swag.",
      });
    }
  } catch (error) {
    console.log(error);
  }
};
