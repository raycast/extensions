import { ActionSettings } from "./components/action-settings";
import { AskAction } from "./components/ask-action";
import { GistList } from "./components/gist-list";
import { withGitHubClient } from "./components/with-github-client";
import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";

function AskGists() {
  const { data: selectedText = "", isLoading } = usePromise(() => getSelectedText().catch(() => ""));
  return (
    <GistList
      searchPlaceholder="Search gists as prompt..."
      renderActions={(props) => (
        <>
          <AskAction {...props} selectedText={selectedText} selectionLoading={isLoading} />
          <ActionSettings command={true} />
        </>
      )}
    />
  );
}

export default withGitHubClient(AskGists);
