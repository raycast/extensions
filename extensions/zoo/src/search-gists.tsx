import { ActionSettings } from "./components/action-settings";
import { GistAction } from "./components/gist-action";
import { GistList } from "./components/gist-list";
import { withGitHubClient } from "./components/with-github-client";

function SearchGists() {
  return (
    <GistList
      searchPlaceholder="Search gists"
      renderActions={(props) => (
        <>
          <GistAction {...props} />
          <ActionSettings command={true} />
        </>
      )}
    />
  );
}

export default withGitHubClient(SearchGists);
