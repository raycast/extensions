import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { INDEX_URL } from "../lib/model";
import { useZeroWire } from "../lib/use-zero-wire";

export function FollowTechnologies({ navigationTitle }: { navigationTitle?: string }) {
  const store = useZeroWire();
  const tags = new Map<string, string>(Object.entries(store.db?.followed ?? {}));
  for (const briefing of store.db?.snapshot?.briefings ?? [])
    for (const tag of briefing.tags) tags.set(tag.id, tag.name);
  return (
    <List
      isLoading={store.loading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Find source technology tags…"
    >
      <List.EmptyView
        title={store.error ? "Source tags are unavailable" : "No source tags available"}
        description={
          store.error ??
          "Tags appear after the first successful source sync. Matches indicate relevance, not confirmed exposure."
        }
        actions={
          <ActionPanel>
            <Action title="Refresh Briefings" icon={Icon.ArrowClockwise} onAction={store.refresh} />
            <Action.OpenInBrowser url={INDEX_URL} title="Open Zero Wire Website" />
          </ActionPanel>
        }
      />
      <List.Section title="Source technology tags" subtitle="Following indicates relevance; assess exposure separately">
        {[...tags]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id, name]) => {
            const followed = Boolean(store.db && id in store.db.followed);
            const count = store.db?.snapshot?.briefings.filter((b) => b.tags.some((t) => t.id === id)).length ?? 0;
            return (
              <List.Item
                key={id}
                title={name}
                icon={{
                  source: followed ? Icon.CheckCircle : Icon.Circle,
                  tintColor: followed ? Color.Green : Color.SecondaryText,
                }}
                accessories={[
                  { text: `${count} briefing${count === 1 ? "" : "s"}` },
                  ...(followed ? [{ tag: "Following" }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={followed ? "Unfollow Technology" : "Follow Technology"}
                      icon={Icon.Tag}
                      onAction={() => store.toggleFollow({ id, name })}
                    />
                    <Action title="Refresh Briefings" icon={Icon.ArrowClockwise} onAction={store.refresh} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
