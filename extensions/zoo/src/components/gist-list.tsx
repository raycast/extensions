import { ActionPanel, Application, Color, Icon, List } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
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
  }) => JSX.Element;
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
      const data = await client.requestGist(t, options.page + 1, parseInt(perPage));
      const hasMore = data[data.length - 1] != options.lastItem && options.page < 50;
      return { data, hasMore };
    },
    [tag],
    { keepPreviousData: true, failureToastOptions: { title: "Failed to load gists" } },
  );

  const { data: gistContentData, isLoading: gistContentLoading } = useCachedPromise(
    (rawUrl: string) => {
      return client.octokit.request(`${rawUrl}`).then((response) => {
        return response.data;
      }) as Promise<string>;
    },
    [gistId],
    { failureToastOptions: { title: "Failed to load gist content" } },
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
    if (!gistContentData) {
      return "";
    }
    return gistContentData.toString();
  }, [gistContentData]);

  return (
    <List
      isShowingDetail={showDetail}
      isLoading={gistsLoading}
      pagination={pagination}
      searchBarPlaceholder={searchPlaceholder}
      onSelectionChange={(id) => {
        if (id) {
          const { url } = JSON.parse(id);
          setGistId(url);
        }
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
                      markdown={formatGistContentDetail(gistFile, gistContent)}
                    />
                  }
                  actions={
                    <ActionPanel>
                      {renderActions({
                        gist,
                        gistFileName: gistFile.filename,
                        gistFileContent: gistContent,
                        tag,
                        gistMutate,
                        frontmostApp,
                      })}
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
