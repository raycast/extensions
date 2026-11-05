import { useState } from "react";
import { Action, ActionPanel, Color, Keyboard, Icon, List } from "@raycast/api";
import { INDEX_URL, categoryName, isUnread, selectBriefings, type Filter } from "../lib/model";
import { useZeroWire } from "../lib/use-zero-wire";
import { BriefingActions } from "./briefing-actions";
import { BriefingDetail } from "./briefing-detail";
import { FollowTechnologies } from "./follow-technologies";

const filters: { value: Filter; title: string }[] = [
  { value: "attention", title: "Needs attention" },
  { value: "all", title: "All" },
  { value: "reference", title: "Reference" },
  { value: "following", title: "Following" },
  { value: "unread", title: "Unread" },
];
export function BriefingList({ saved = false }: { saved?: boolean }) {
  const store = useZeroWire();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(saved ? "all" : "attention");
  const items = store.db ? selectBriefings(store.db, query, filter, saved) : [];
  const categories = [...new Set(items.map((b) => b.category))];
  const commonActions = (
    <ActionPanel>
      <Action
        title="Refresh Briefings"
        icon={Icon.ArrowClockwise}
        onAction={store.refresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.OpenInBrowser title="Open Zero Wire Website" url={INDEX_URL} />
      <Action.Push
        title="Follow Technologies"
        icon={Icon.Tag}
        target={<FollowTechnologies navigationTitle="Follow Technologies" />}
      />
    </ActionPanel>
  );
  const hasSnapshot = Boolean(store.db?.snapshot);
  return (
    <List
      isLoading={store.loading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles, CVEs, or technology tags…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter briefings"
          value={filter}
          onChange={(value) => {
            const option = filters.find((item) => item.value === value);
            if (option) setFilter(option.value);
          }}
        >
          {filters.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      {store.error && (
        <List.Section title="Source status">
          <List.Item
            title={hasSnapshot ? "Showing cached briefings" : "Zero Wire is unavailable"}
            subtitle={store.error}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            accessories={
              store.db?.snapshot ? [{ text: `Checked ${new Date(store.db.snapshot.checkedAt).toLocaleString()}` }] : []
            }
            actions={commonActions}
          />
        </List.Section>
      )}
      {!items.length && !store.loading && hasSnapshot && (
        <List.Section>
          <List.Item
            title={saved ? "No saved briefings match" : "No briefings match"}
            subtitle={
              filter === "following"
                ? "Follow source tags to see relevant briefings"
                : "Try another query or choose All"
            }
            icon={Icon.MagnifyingGlass}
            actions={commonActions}
          />
        </List.Section>
      )}
      {!hasSnapshot && !store.error && (
        <List.EmptyView
          title={store.loading ? "Loading Zero Wire…" : "No briefing snapshot available"}
          description="Refresh to retrieve Cloudflare's source briefings."
          actions={commonActions}
        />
      )}
      {categories.map((category) => (
        <List.Section
          key={category}
          title={categoryName(category)}
          subtitle={category === "reference" ? "Source reference category" : undefined}
        >
          {items
            .filter((b) => b.category === category)
            .map((b) => (
              <List.Item
                key={b.id}
                title={b.title}
                subtitle={b.cves.join(" · ")}
                icon={{
                  source: category === "attention" ? Icon.Shield : Icon.Document,
                  tintColor: category === "attention" ? Color.Orange : Color.SecondaryText,
                }}
                accessories={[
                  { tag: b.action, tooltip: "Source recommended action" },
                  ...(store.db && isUnread(b, store.db)
                    ? [{ icon: { source: Icon.CircleFilled, tintColor: Color.Blue }, tooltip: "Unread revision" }]
                    : [{ icon: Icon.Checkmark, tooltip: "Reviewed revision" }]),
                  ...(store.db?.bookmarks[b.id] ? [{ icon: Icon.Bookmark, tooltip: "Bookmarked locally" }] : []),
                  { text: b.lastChecked ?? "Unknown date", tooltip: "Source last checked, not publication time" },
                ]}
                actions={
                  <BriefingActions briefing={b}>
                    <Action.Push title="Read Briefing" icon={Icon.Document} target={<BriefingDetail briefing={b} />} />
                    <Action.Push
                      title="Manage Followed Technologies"
                      icon={Icon.Tag}
                      target={<FollowTechnologies navigationTitle="Follow Technologies" />}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "f" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "f" },
                      }}
                    />
                  </BriefingActions>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
