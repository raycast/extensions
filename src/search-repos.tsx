import {
  Action,
  ActionPanel,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchAllRepos, Repository } from "./services/github";

const CACHE_KEY = "github-repos-cache";
const CACHE_TIMESTAMP_KEY = "github-repos-cache-timestamp";
const CACHE_TTL = 5 * 60 * 1000;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRepos = async (forceRefresh = false) => {
    try {
      const cachedRepos = await LocalStorage.getItem<string>(CACHE_KEY);
      const cachedTimestamp =
        await LocalStorage.getItem<number>(CACHE_TIMESTAMP_KEY);

      if (cachedRepos && !forceRefresh) {
        setRepos(JSON.parse(cachedRepos));
        setIsLoading(false);
      }

      const now = Date.now();
      const isStale =
        !cachedTimestamp || now - (cachedTimestamp as number) > CACHE_TTL;

      if (isStale || !cachedRepos || forceRefresh) {
        if (!cachedRepos && !forceRefresh) setIsLoading(true);
        if (forceRefresh) setIsRefreshing(true);

        const freshRepos = await fetchAllRepos();
        setRepos(freshRepos);

        await LocalStorage.setItem(CACHE_KEY, JSON.stringify(freshRepos));
        await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, now);
        setIsLoading(false);
        setIsRefreshing(false);

        if (forceRefresh) {
          showToast({
            style: Toast.Style.Success,
            title: "Repositories refreshed",
            message: `Loaded ${freshRepos.length} repositories`,
          });
        }
      }
    } catch (error) {
      console.error("Error loading repos:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repositories",
        message: String(error),
      });
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRepos();

    const interval = setInterval(() => {
      loadRepos();
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, []);

  const { data: sortedRepos, visitItem } = useFrecencySorting(repos, {
    key: (repo) => repo.full_name,
    sortUnvisited: () => 0,
  });

  const filteredRepos = sortedRepos.filter((repo) => {
    const query = searchText.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.owner.login.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );
  });

  const showRecent = searchText === "";
  const recentRepos = showRecent ? filteredRepos.slice(0, 6) : [];
  const otherRepos = showRecent ? filteredRepos.slice(6) : filteredRepos;

  return (
    <List
      isLoading={isLoading || isRefreshing}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
      throttle={true}
    >
      {showRecent && recentRepos.length > 0 && (
        <List.Section title="Recent">
          {recentRepos.map((repo) => (
            <RepoItem
              key={repo.id}
              repo={repo}
              onVisit={() => visitItem(repo)}
              onRefresh={() => loadRepos(true)}
            />
          ))}
        </List.Section>
      )}

      <List.Section title={showRecent ? "All Repositories" : "Results"}>
        {otherRepos.map((repo) => (
          <RepoItem
            key={repo.id}
            repo={repo}
            onVisit={() => visitItem(repo)}
            onRefresh={() => loadRepos(true)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function RepoItem({
  repo,
  onVisit,
  onRefresh,
}: {
  repo: Repository;
  onVisit: () => void;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.owner.login}
      icon={repo.owner.avatar_url}
      accessories={[
        { text: repo.language || "" },
        { text: repo.private ? "🔒" : "" },
      ]}
      actions={
        <ActionPanel>
          <Action.Open
            target={repo.html_url}
            title="Open in Browser"
            onOpen={onVisit}
          />
          <Action.CopyToClipboard
            content={repo.html_url}
            title="Copy URL"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action
            title="Refresh All Repositories"
            icon="↻"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
