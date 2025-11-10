import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { Artist } from "../utils/youtube";

interface ArtistDetailProps {
  artist: Artist;
}

export function ArtistDetail({ artist }: ArtistDetailProps) {
  const markdown = `
# ${artist.name}

![Artist Image](${artist.thumbnail})

## Statistics

- **Subscribers:** ${artist.subscriberCount || "N/A"}
- **Videos:** ${artist.videoCount || "N/A"}

## About

${artist.description || "No description available."}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={artist.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist Name" text={artist.name} />
          <Detail.Metadata.Label title="Subscribers" text={artist.subscriberCount || "N/A"} />
          <Detail.Metadata.Label title="Total Videos" text={artist.videoCount || "N/A"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="YouTube Music" target={artist.url} text="Open Channel" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in YouTube Music" url={artist.url} icon={Icon.Globe} />
          <Action.CopyToClipboard title="Copy URL" content={artist.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard
            title="Copy Name"
            content={artist.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
