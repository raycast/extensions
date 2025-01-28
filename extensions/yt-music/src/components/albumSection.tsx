import { Action, ActionPanel, Image, List } from "@raycast/api";
import { AlbumDetailed } from "ytmusic-api";
import { ActionType } from "./actionType";

type AlbumSectionProps = {
  data: AlbumDetailed[];
};

export const AlbumSection = ({ data }: AlbumSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <List.Section title="Albums">
      {data.map((album, index) => (
        <AlbumItem key={index} album={album} />
      ))}
    </List.Section>
  );
};

const AlbumItem = ({ album }: { album: AlbumDetailed }) => {
  let icon: Image.ImageLike | undefined = undefined;

  if (album.thumbnails && album.thumbnails.length > 0) {
    icon = {
      source: album.thumbnails[album.thumbnails.length - 1]?.url,
    };
  }

  const url = `https://music.youtube.com/playlist?list=${album.albumId}`;

  return (
    <List.Item
      icon={icon}
      title={album.name}
      subtitle={`${album.artist.name} • ${album.year}`}
      actions={
        <ActionPanel>
          <ActionType
            {...{
              url,
              title: `View ${album.name}'s album`,
            }}
          />
          <Action.CopyToClipboard content={url} />
        </ActionPanel>
      }
    />
  );
};
