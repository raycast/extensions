import { Action, ActionPanel, Application, Icon, open, showHUD, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { getGitHubClient } from "../api/oauth";
import { CreateGistForm } from "../create-gist";
import { Gist, GithubGistTag } from "../util/gist-utils";
import { alertDialog, raySo } from "../util/utils";
import { AIAction } from "./ai-action";

export function AskAction(props: {
  gist: Gist;
  gistFileName: string;
  gistFileContent: string;
  tag: GithubGistTag;
  gistMutate: MutatePromise<Gist[]>;
  frontmostApp: Application;
}) {
  const client = getGitHubClient();
  // frontmostApp is not used for now, but may be used in the future
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gist, gistFileName, gistFileContent, tag, gistMutate, frontmostApp: _frontmostApp } = props;

  return (
    <>
      <AIAction content={gistFileContent} />
      <ActionPanel.Section>
        {(() => {
          switch (tag) {
            case GithubGistTag.MY_GISTS: {
              return (
                <>
                  <Action
                    title={"Star Gist"}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={async () => {
                      const response = await client.starGist(gist.gist_id);
                      if (response.status == 204) {
                        await showToast(Toast.Style.Success, "Gist Stared");
                      } else {
                        await showToast(Toast.Style.Failure, "Failed to Star Gist");
                      }
                    }}
                  />
                  <Action.Push
                    title={"Edit Gist"}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<CreateGistForm gist={gist} gistMutate={gistMutate} />}
                  />
                </>
              );
            }
            case GithubGistTag.ALL_GISTS: {
              return (
                <Action
                  title={"Star Gist"}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={async () => {
                    const response = await client.starGist(gist.gist_id);
                    if (response.status == 204) {
                      await showToast(Toast.Style.Success, "Gist Stared");
                    } else {
                      await showToast(Toast.Style.Failure, "Failed to Star Gist");
                    }
                  }}
                />
              );
            }
            case GithubGistTag.STARRED: {
              return (
                <Action
                  title={"Unstar Gist"}
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={async () => {
                    const response = await client.unStarGist(gist.gist_id);
                    if (response.status == 204) {
                      await showToast(Toast.Style.Success, "Gist Unstared");
                      await gistMutate();
                    } else {
                      await showToast(Toast.Style.Failure, "Failed to Unstar Gist");
                    }
                  }}
                />
              );
            }
            default:
              break;
          }
        })()}
        <Action.Push
          title={"Create Gist"}
          icon={Icon.PlusTopRightSquare}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateGistForm gist={undefined} gistMutate={gistMutate} />}
        />
        <Action
          title={"Clone Gist"}
          icon={Icon.SaveDocument}
          shortcut={{ modifiers: ["cmd"], key: "g" }}
          onAction={async () => {
            await open("x-github-client://openRepo/" + gist.html_url);
            await showHUD("Clone Gist");
          }}
        />

        {tag === GithubGistTag.MY_GISTS && (
          <Action
            title={"Delete Gist"}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              await alertDialog(
                Icon.Trash,
                "Delete Gist",
                "Are you sure you want to delete this gist?",
                "Confirm",
                async () => {
                  const response = await client.deleteGist(gist.gist_id);
                  if (response.status == 204) {
                    await showToast(Toast.Style.Success, "Gist Deleted");
                    await gistMutate();
                  } else {
                    await showToast(Toast.Style.Failure, "Failed to Delete Gist");
                  }
                },
              );
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Gist Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          content={gist.html_url}
        />
        <Action.CopyToClipboard
          title={"Copy Raw Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          content={gist.file[0].raw_url}
        />
        <Action.OpenInBrowser
          title={"Open in Browser"}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          url={gist.html_url}
        />
        <Action.CreateSnippet
          icon={Icon.Snippets}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          snippet={{ name: gistFileName, text: gistFileContent }}
        />
        <Action.CreateQuicklink
          shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
          quicklink={{ name: gistFileName, link: gist.html_url }}
        />
        <Action.OpenInBrowser
          title={"Open in Ray.so"}
          icon={Icon.RaycastLogoPos}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          url={raySo(gistFileName, gistFileContent)}
        />
      </ActionPanel.Section>
    </>
  );
}
