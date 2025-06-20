import { ActionPanel } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { AddToQueueAction } from "./AddtoQueueAction";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";

type EpisodeActionPanelProps = {
  title: string;
  episode: SimplifiedEpisodeObject;
};

export function EpisodeActionPanel({ title, episode }: EpisodeActionPanelProps) {
  return (
    <ActionPanel>
      <PlayAction id={episode.id as string} type="episode" />
      <AddToQueueAction uri={episode.uri} title={title} />
      <FooterAction url={episode?.external_urls?.spotify} uri={episode.uri} title={title} />
    </ActionPanel>
  );
}
