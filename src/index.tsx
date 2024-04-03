import { useReducer, useEffect } from "react";
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

import { showFailureToast } from "@raycast/utils";
import { State, initialState, reducer } from "./reducer";
import { generateCommitMessage, getRepositoryPath } from "./utils";

export default function Command() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const preferences = getPreferenceValues<Preferences>();
  const pathToRepos = preferences["path-to-git-repos"] || "~/";
  const prompt = preferences["commit-prompt"] || "";

  const repositoryPath = getRepositoryPath(pathToRepos);
  const { data: commitMessage, isLoading, error, revalidate } = generateCommitMessage(repositoryPath, prompt);

  const pasteCommitMessageAndClose = () => {
    if (state.commitMessage) {
      Clipboard.paste(state.commitMessage);
    } else {
      popToRoot();
    }
  };

  useEffect(() => {
    getFrontmostApplication().then((application) => {
      dispatch(["set_frontmost_application", application]);
    });
  }, []);

  useEffect(() => {
    dispatch(["set_commit_message", commitMessage]);
  }, [commitMessage]);

  useEffect(() => {
    dispatch(["set_repository_path", repositoryPath]);
  }, [repositoryPath]);

  useEffect(() => {
    if (error) {
      showFailureToast(error, { title: "Failed to generate commit message" });
    }
  }, [error]);

  return content(state, pasteCommitMessageAndClose, revalidate, isLoading);
}

function content(
  state: State,
  primaryActionOnAction: () => void,
  secondaryActionOnAction: () => void,
  isLoading: boolean,
) {
  const markdown = `
  ${isLoading ? "Generating Commit Message for" : "Generated Commit Message for"}

  ${state.repositoryPath ? `\`${state.repositoryPath}\`` : ""}
  # ${isLoading ? "Generating.." : state.commitMessage}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title={isLoading ? "Cancel Generation" : `Paste Response to ${state.frontmostApplication}`}
            shortcut={{ modifiers: ["opt"], key: "enter" }}
            icon={isLoading ? Icon.XMarkCircleFilled : Icon.Clipboard}
            onAction={primaryActionOnAction}
          />
          <Action
            title="Regenerate"
            shortcut={{ modifiers: ["opt"], key: "r" }}
            icon={Icon.ArrowClockwise}
            onAction={secondaryActionOnAction}
          />
        </ActionPanel>
      }
    />
  );
}
