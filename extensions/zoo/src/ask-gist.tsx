import { ActionSettings } from "./components/action-settings";
import { AskAction } from "./components/ask-action";
import { GistList } from "./components/gist-list";
import { withGitHubClient } from "./components/with-github-client";

function AskGists() {
  return (
    <GistList
      searchPlaceholder="Search gists as prompt..."
      renderActions={(props) => (
        <>
          <AskAction {...props} />
          <ActionSettings command={true} />
        </>
      )}
    />
  );
}

export default withGitHubClient(AskGists);
