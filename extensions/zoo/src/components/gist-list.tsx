import { Action, ActionPanel, Application, Color, Icon, List } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { ReactElement, useMemo, useState } from "react";
import { getGitHubClient } from "../api/oauth";
import { useFrontmostApp } from "../hooks/useFrontmostApp";
import { perPage, rememberTag, showDetail } from "../types/preferences";
import { Gist, GithubGistTag, githubGistTags } from "../util/gist-utils";
import { formatGistContentDetail } from "../util/utils";

interface GistListProps {
  searchPlaceholder: string;
  renderActions: (props: {
    gist: Gist;
    gistFileName: string;
    gistFileContent: string;
    tag: GithubGistTag;
    gistMutate: MutatePromise<Gist[]>;
    frontmostApp: Application;
  }) => ReactElement;
}

export function GistList({ searchPlaceholder, renderActions }: GistListProps) {
  const client = getGitHubClient();
  const [tag, setTag] = useState<GithubGistTag>(GithubGistTag.MY_GISTS);
  const [gistId, setGistId] = useState<string>("");

  const { data: frontmostAppData } = useFrontmostApp();

  const {
    data: gistsData,
    isLoading: gistsLoading,
    mutate: gistMutate,
    pagination,
  } = useCachedPromise(
    (t: string) => async (options) => {
      return client.requestGist(t, options.page + 1, parseInt(perPage || "30"));
    },
    [tag],
    { keepPreviousData: true, failureToastOptions: { title: "Failed to load gists" } },
  );

  const {
    data: gistContentData,
    isLoading: gistContentLoading,
    error: gistContentError,
    revalidate: reloadGistContent,
  } = useCachedPromise(
    async (rawUrl: string) => {
      const response = await client.octokit.request(rawUrl);
      return { rawUrl, content: String(response.data) };
    },
    [gistId],
    { execute: Boolean(gistId), failureToastOptions: { title: "Failed to load gist content" } },
  );

  const frontmostApp = useMemo(() => {
    return frontmostAppData as Application;
  }, [frontmostAppData]);

  const gists = useMemo(() => {
    if (!gistsData) {
      return [];
    }
    return gistsData;
  }, [gistsData]);

  const gistContent = useMemo(() => {
    if (!gistContentData || gistContentData.rawUrl !== gistId || gistContentLoading) {
      return "";
    }
    return gistContentData.content;
  }, [gistContentData, gistId, gistContentLoading]);

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={gistsLoading || gistContentLoading}
      pagination={pagination}
      searchBarPlaceholder={searchPlaceholder}
      onSelectionChange={(id) => {
        setGistId(id ? JSON.parse(id).url : "");
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="GitHub Gist"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setTag(newValue as GithubGistTag);
          }}
        >
          {githubGistTags.map((tag) => {
            return <List.Dropdown.Item key={tag.title} title={tag.title} value={tag.value} icon={tag.icon} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={"No Gists"} icon={Icon.CodeBlock} />
      {gists?.map((gist, gistIndex) => {
        return (
          <List.Section key={"gist" + gistIndex + gist.gist_id} title={gist.description}>
            {gist.file.map((gistFile, gistFileIndex, gistFileArray) => {
              return (
                <List.Item
                  id={JSON.stringify({
                    gistIndex: gistIndex,
                    gistFileIndex: gistFileIndex,
                    url: gistFileArray[gistFileIndex].raw_url,
                    gistId: gist.gist_id,
                  })}
                  key={"gistFile" + gistIndex + gistFileIndex}
                  icon={{ source: Icon.CodeBlock, tintColor: Color.SecondaryText }}
                  title={{
                    value: gistFile?.filename,
                    tooltip: `${gistFile?.filename}
Size: ${gistFile.size}`,
                  }}
                  accessories={[
                    {
                      text: gistFile.language == "null" ? "Binary" : gistFile.language,
                      tooltip: gistFile.type,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      isLoading={gistContentLoading}
                      markdown={formatGistContentDetail(gistFile, gistFile.raw_url === gistId ? gistContent : "")}
                    />
                  }
                  actions={
                    <ActionPanel>
                      {!gistContentLoading && !gistContentError && gistContentData?.rawUrl === gistFile.raw_url ? (
                        renderActions({
                          gist,
                          gistFileName: gistFile.filename,
                          gistFileContent: gistContentData.content,
                          tag,
                          gistMutate,
                          frontmostApp,
                        })
                      ) : gistContentError ? (
                        <Action title="Retry Loading Gist" icon={Icon.Repeat} onAction={reloadGistContent} />
                      ) : (
                        <Action title="Loading Gist Content" icon={Icon.Clock} onAction={() => undefined} />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
