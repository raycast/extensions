/**
 * Unified home surface for Zshrc Manager.
 *
 * At rest: an overview — a live health row, Browse (categories with
 * counts, plus Recently Managed), Discover. Roughly 15 rows. The full
 * tool set lives in the Tools command; every tool also stays reachable
 * from here by shortcut and by search.
 *
 * While typing: categories hide and results go flat and cross-type,
 * ranked by relevance and frecency, with catalogue matches inline below
 * under "Available to Add".
 *
 * Categories push focused views via Action.Push, so Esc returns home and
 * the freed searchBarAccessory slot holds each view's warning filter.
 */

import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useAliasCollections, type CollectionMetadata } from "./hooks/useAliasCollections";
import { createSearchResults, filterResults, SearchResultListItem, type SearchResult } from "./lib/search-results";
import { DetailToggleContext, SharedActionsSection } from "./lib/shared-actions";
import { getSectionImage } from "./lib/section-icons";
import { useHealthReport, healthSummaryMarkdown } from "./hooks/useHealthReport";
import { MODERN_COLORS } from "./constants";
import Sections from "./sections";
import Aliases from "./aliases";
import Exports from "./exports";
import Functions from "./functions";
import Plugins from "./plugins";
import Sources from "./sources";
import Evals from "./evals";
import Setopts from "./setopts";
import PathEntries from "./path-entries";
import FpathEntries from "./fpath-entries";
import Keybindings from "./keybindings";
import HealthCheck from "./health-check";
import BackupManager from "./backup-manager";
import BrowseAliases from "./browse-aliases";
import HistoryView from "./history-view";
import CollectionDetail from "./collection-detail";
import RecentlyManaged from "./recently-managed";

/** A Browse category: one entry type and the focused view it pushes */
interface Category {
  type: SearchResult["type"];
  title: string;
  icon: Icon;
  tintColor: string;
  view: () => React.ReactElement;
}

const CATEGORIES: Category[] = [
  { type: "alias", title: "Aliases", icon: Icon.Terminal, tintColor: MODERN_COLORS.success, view: () => <Aliases /> },
  { type: "export", title: "Exports", icon: Icon.Upload, tintColor: MODERN_COLORS.primary, view: () => <Exports /> },
  {
    type: "function",
    title: "Functions",
    icon: Icon.Code,
    tintColor: MODERN_COLORS.purple,
    view: () => <Functions />,
  },
  { type: "plugin", title: "Plugins", icon: Icon.Plug, tintColor: MODERN_COLORS.warning, view: () => <Plugins /> },
  { type: "source", title: "Sources", icon: Icon.Document, tintColor: MODERN_COLORS.primary, view: () => <Sources /> },
  { type: "eval", title: "Evals", icon: Icon.Bolt, tintColor: MODERN_COLORS.error, view: () => <Evals /> },
  { type: "setopt", title: "Setopts", icon: Icon.Gear, tintColor: MODERN_COLORS.neutral, view: () => <Setopts /> },
  { type: "path", title: "PATH Entries", icon: Icon.Tree, tintColor: MODERN_COLORS.info, view: () => <PathEntries /> },
  {
    type: "fpath",
    title: "FPATH Entries",
    icon: Icon.Folder,
    tintColor: MODERN_COLORS.warning,
    view: () => <FpathEntries />,
  },
  {
    type: "keybinding",
    title: "Keybindings",
    icon: Icon.Keyboard,
    tintColor: MODERN_COLORS.accent,
    view: () => <Keybindings />,
  },
];

/** Detail pane for a Browse category row: counts in context */
function CategoryDetail({ category, results }: { category: Category; results: SearchResult[] }) {
  const mine = results.filter((result) => result.type === category.type);
  const bySection = new Map<string, number>();
  for (const result of mine) {
    bySection.set(result.section, (bySection.get(result.section) ?? 0) + 1);
  }
  const sections = [...bySection.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <List.Item.Detail
      markdown={`## ${category.title}\n\n${mine.length} across ${sections.length} section${sections.length === 1 ? "" : "s"}.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Total" text={String(mine.length)} />
          <List.Item.Detail.Metadata.Label title="Sections" text={String(sections.length)} />
          <List.Item.Detail.Metadata.Separator />
          {sections.slice(0, 8).map(([name, count]) => (
            <List.Item.Detail.Metadata.Label
              key={name}
              title={name}
              text={String(count)}
              icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.neutral }}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Unified home command: search-first overview of the whole zshrc
 */
export default function ZshrcManager() {
  const { sections, isLoading, refresh } = useZshrcLoader("Zshrc Manager");
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(new Set());

  const results = useMemo(() => createSearchResults(sections), [sections]);
  const { data: ranked, visitItem } = useFrecencySorting(results, {
    key: (result) => result.id,
    namespace: "zshrc-home",
  });

  // The same health report Health Check renders — one computation, so the
  // badge, the summary pane and the issues view always agree
  const health = useHealthReport(sections);
  const issueCount = health.issues.length;

  // Catalogue for Discover / "Available to Add" — the real manifest,
  // fetched (and cached) by the collection fetcher
  const { collections, getCollection, loadCollection } = useAliasCollections();

  const openCollection = async (metadata: CollectionMetadata) => {
    const loaded = getCollection(metadata.id) ?? (await loadCollection(metadata.id));
    if (loaded) {
      push(<CollectionDetail collection={loaded} onDataChange={refresh} />);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Load Collection",
        message: metadata.name,
      });
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const query = searchText.trim().toLowerCase();
  const counts = useMemo(() => {
    const byType = new Map<SearchResult["type"], number>();
    for (const result of results) {
      byType.set(result.type, (byType.get(result.type) ?? 0) + 1);
    }
    return byType;
  }, [results]);

  interface Tool {
    id: string;
    title: string;
    subtitle: string;
    icon: Icon;
    badge: { value: string; color: Color } | undefined;
    keywords: string;
    target: () => React.ReactElement;
    shortcut: Keyboard.Shortcut;
  }

  const healthTool: Tool = {
    id: "health",
    title: "Health Check",
    subtitle: "Duplicates, conflicts and broken sources",
    icon: Icon.Heartbeat,
    badge: health.isChecking
      ? { value: "Checking…", color: Color.SecondaryText }
      : issueCount > 0
        ? {
            value: `${issueCount} ${issueCount === 1 ? "issue" : "issues"}`,
            color: health.errorIssues.length > 0 ? Color.Red : Color.Yellow,
          }
        : { value: "All clear", color: Color.Green },
    keywords: "health check issues duplicates conflicts broken doctor",
    target: () => <HealthCheck />,
    shortcut: { modifiers: ["cmd", "shift"], key: "h" },
  };

  // The score/statistics summary Health Check used to carry as its first
  // row — rendered here, where the pane would otherwise be empty
  const healthSummaryPane = <List.Item.Detail markdown={healthSummaryMarkdown(health)} />;

  const tools: Tool[] = [
    healthTool,
    {
      id: "backup",
      title: "Backup Manager",
      subtitle: "Restore or diff a previous version",
      icon: Icon.SaveDocument,
      badge: undefined,
      keywords: "backup restore diff snapshot",
      target: () => <BackupManager />,
      shortcut: { modifiers: ["cmd", "shift"], key: "b" },
    },
    {
      id: "history",
      title: "History",
      subtitle: "Undo and redo recent changes",
      icon: Icon.ArrowCounterClockwise,
      badge: undefined,
      keywords: "history undo redo changes",
      target: () => <HistoryView onRefresh={refresh} />,
      shortcut: { modifiers: ["cmd", "shift"], key: "y" },
    },
  ];

  // Global actions: tools reachable from every row, the empty state, and
  // by shortcut
  const homeActions = (
    <ActionPanel>
      <ActionPanel.Section title="Tools">
        {tools.map((tool) => (
          <Action.Push
            key={tool.id}
            title={tool.title}
            icon={tool.icon}
            shortcut={tool.shortcut}
            target={tool.target()}
          />
        ))}
        <Action.Push
          title="Browse Alias Collections"
          icon={Icon.Book}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          target={<BrowseAliases onDataChange={refresh} />}
        />
      </ActionPanel.Section>
      <SharedActionsSection onRefresh={refresh} showHistory={false} />
    </ActionPanel>
  );

  const matchedResults = query ? filterResults(ranked, searchText) : [];
  const matchedTools = query
    ? tools.filter((tool) => `${tool.title} ${tool.keywords}`.toLowerCase().includes(query))
    : [];
  const matchedCollections = query
    ? collections.filter((collection) =>
        [collection.name, collection.description, collection.category, ...(collection.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : [];

  const renderResultRow = (result: SearchResult) => (
    <SearchResultListItem
      key={result.id}
      result={result}
      refresh={refresh}
      revealed={revealedIds.has(result.id)}
      onToggleReveal={() => toggleReveal(result.id)}
      showDetail={showDetail}
      showSubtitle={!showDetail}
      onVisit={() => visitItem(result)}
    />
  );

  return (
    <DetailToggleContext.Provider value={{ shown: showDetail, toggle: () => setShowDetail((shown) => !shown) }}>
      <List
        navigationTitle="Zshrc Manager"
        searchBarPlaceholder="Search your zshrc, or discover something to add…"
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isLoading={isLoading}
        isShowingDetail={showDetail}
        actions={homeActions}
      >
        {!query && (
          <>
            <List.Section title="Health">
              <List.Item
                key={healthTool.id}
                title={healthTool.title}
                icon={{ source: healthTool.icon, tintColor: MODERN_COLORS.primary }}
                accessories={healthTool.badge ? [{ tag: healthTool.badge }] : []}
                detail={healthSummaryPane}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`Open ${healthTool.title}`}
                      icon={healthTool.icon}
                      target={healthTool.target()}
                    />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
            </List.Section>

            <List.Section title="Browse">
              <List.Item
                key="sections"
                title="Sections"
                icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.neutral }}
                accessories={[{ text: String(sections.length) }, { icon: Icon.ChevronRight }]}
                detail={
                  <List.Item.Detail
                    markdown={`## Sections\n\n${sections.length} configuration block${sections.length === 1 ? "" : "s"} in your zshrc.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push title="Browse Sections" icon={Icon.List} target={<Sections />} />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
              <List.Item
                key="recently-managed"
                title="Recently Managed"
                icon={{ source: Icon.Clock, tintColor: MODERN_COLORS.accent }}
                accessories={[{ icon: Icon.ChevronRight }]}
                detail={
                  <List.Item.Detail
                    markdown={`## Recently Managed\n\nEvery entry, ordered by how recently and how often you have opened or edited it here. Tracks activity in this extension, not shell usage.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push title="Browse Recently Managed" icon={Icon.Clock} target={<RecentlyManaged />} />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
              {CATEGORIES.filter((category) => (counts.get(category.type) ?? 0) > 0).map((category) => (
                <List.Item
                  key={category.type}
                  title={category.title}
                  icon={{ source: category.icon, tintColor: category.tintColor }}
                  accessories={[{ text: String(counts.get(category.type)) }, { icon: Icon.ChevronRight }]}
                  detail={<CategoryDetail category={category} results={results} />}
                  actions={
                    <ActionPanel>
                      <Action.Push title={`Browse ${category.title}`} icon={Icon.List} target={category.view()} />
                      {homeActions.props.children}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>

            <List.Section title="Discover">
              <List.Item
                key="collections"
                title="Browse Alias Collections"
                icon={{ source: Icon.Book, tintColor: MODERN_COLORS.primary }}
                accessories={[{ icon: Icon.ChevronRight }]}
                detail={
                  <List.Item.Detail
                    markdown={`## Browse Alias Collections\n\nCurated collections you can add to your zshrc.\n\n${
                      collections.length > 0
                        ? collections
                            .slice(0, 8)
                            .map((collection) => `- **${collection.name}** — ${collection.description}`)
                            .join("\n")
                        : "_Loading catalogue…_"
                    }\n\n_Also surfaced inline whenever you search._`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Browse Collections"
                      icon={Icon.Book}
                      target={<BrowseAliases onDataChange={refresh} />}
                    />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
            </List.Section>
          </>
        )}

        {query && matchedTools.length > 0 && (
          <List.Section title="Tools">
            {matchedTools.map((tool) => (
              <List.Item
                key={tool.id}
                title={tool.title}
                icon={{ source: tool.icon, tintColor: MODERN_COLORS.primary }}
                accessories={tool.badge ? [{ tag: tool.badge }] : []}
                detail={<List.Item.Detail markdown={`## ${tool.title}\n\n${tool.subtitle}`} />}
                actions={
                  <ActionPanel>
                    <Action.Push title={`Open ${tool.title}`} icon={tool.icon} target={tool.target()} />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {query && matchedResults.length > 0 && (
          <List.Section title="In Your Zshrc" subtitle={String(matchedResults.length)}>
            {matchedResults.slice(0, 50).map(renderResultRow)}
          </List.Section>
        )}

        {query && matchedCollections.length > 0 && (
          <List.Section title="Available to Add">
            {matchedCollections.map((collection) => (
              <List.Item
                key={collection.id}
                title={collection.name}
                subtitle={showDetail ? "" : collection.description}
                icon={getSectionImage(collection.icon || collection.id)}
                accessories={[{ tag: { value: "Available", color: Color.SecondaryText } }]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${collection.name}\n\n${collection.description}\n\n**Category:** ${collection.category}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="View Collection" icon={Icon.Book} onAction={() => openCollection(collection)} />
                    {homeActions.props.children}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        <List.EmptyView
          title={query ? "Nothing matches" : "Nothing here yet"}
          description={
            query
              ? "Try another search, or check the catalogue"
              : "Your zshrc appears to be empty — add something first"
          }
          icon={Icon.MagnifyingGlass}
          actions={homeActions}
        />
      </List>
    </DetailToggleContext.Provider>
  );
}
