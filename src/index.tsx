import React from "react";
import { execSync } from "child_process";
import {
  Icon,
  ActionPanel,
  Action,
  Detail,
  Clipboard,
  getFrontmostApplication,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";

import { useAI, showFailureToast } from "@raycast/utils";

interface State {
  frontmostApplication?: string | undefined;
  repositoryPath?: string | undefined;
  commitMessage?: string | undefined;
}

export default function Command() {
  const [state, setState] = React.useState<State>({});
  const preferences = getPreferenceValues<Preferences>();
  const pathToRepos = preferences["path-to-git-repos"] || "~/";
  const prompt = preferences["commit-prompt"] || "";

  React.useEffect(() => {
    getFrontmostApplication().then((application) => {
      setState((state) => ({ ...state, frontmostApplication: application?.name || "Active app" }));
    });
  }, []);

  const repositoryPath = getRepositoryPath(pathToRepos);
  const { data: commitMessage, isLoading, error, revalidate } = generateCommitMessage(repositoryPath, prompt);

  if (error) {
    showFailureToast(error, { title: "Failed to generate commit message" });
  }

  React.useEffect(() => {
    setState((state) => ({ ...state, commitMessage: commitMessage, repositoryPath: repositoryPath }));
  }, [commitMessage, repositoryPath]);

  return Content(
    isLoading ? "Cancel Generation" : `Paste Response to ${state.frontmostApplication}`,
    isLoading ? Icon.XMarkCircleFilled : Icon.Clipboard,
    () => {
      if (state.commitMessage) {
        Clipboard.paste(state.commitMessage);
      } else {
        popToRoot();
      }
    },
    "Regenerate",
    Icon.ArrowClockwise,
    revalidate,
    isLoading,
    state.repositoryPath,
    state.commitMessage,
  );
}

function Content(
  primaryActionTitle: string,
  primaryActionIcon: Icon,
  primaryActionOnAction: () => void,
  secondaryActionTitle: string,
  secondaryActionIcon: Icon,
  secondaryActionOnAction: () => void,
  isLoading: boolean,
  repositoryPath: string | undefined,
  commitMessage: string | undefined,
) {
  const markdown = `
  ${isLoading ? "Generating Commit Message for" : "Generated Commit Message for"}

  ${repositoryPath ? `\`${repositoryPath}\`` : ""}
  # ${isLoading ? "Generating.." : commitMessage}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title={primaryActionTitle}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
            icon={primaryActionIcon}
            onAction={primaryActionOnAction}
          />
          <Action
            title={secondaryActionTitle}
            shortcut={{ modifiers: ["opt"], key: "r" }}
            icon={secondaryActionIcon}
            onAction={secondaryActionOnAction}
          />
        </ActionPanel>
      }
    />
  );
}

function getRepositoryPath(pathToRepos: string) {
  return execSync(`ls -ltd -d ${pathToRepos}/*/.git/ | head -n 1 | rev | cut -d' ' -f1 | rev | xargs dirname`)
    .toString()
    .trim();
}

function buildInputForAi(repositoryPath: string, prompt: string) {
  const diffOutput = execSync(`git -C ${repositoryPath} diff HEAD`).toString().slice(0, 9000);
  const statusOutput = execSync(`git -C ${repositoryPath} status -uno`);

  return `${prompt}\n\nMy git status is: \n\n${statusOutput}\n\nMy git diff is: \n\n${diffOutput}\n\n`;
}

function generateCommitMessage(repositoryPath: string, prompt: string) {
  try {
    const input = buildInputForAi(repositoryPath, prompt);
    return useAI(input, { creativity: 0 });
  } catch (error) {
    showFailureToast(error, { title: "Failed to generate commit message" });
    return { data: undefined, isLoading: false, error: error, revalidate: () => {} };
  }
}
