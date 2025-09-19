import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { withCache } from "@raycast/utils";
import { useEffect, useState } from "react";

type Preferences = {
  footballDataKey?: string;
  sportsDbKey?: string;
  timezone?: string;
  listStandings?: boolean;
};

type MatchCommon = {
  utcDate?: string | null;
  competition?: string | null;
  isHome: boolean;
  homeTeam: string;
  awayTeam: string;
  venue?: string | null;
  city?: string | null;
  homeBadge?: string | null;
  awayBadge?: string | null;
  status?: string | null;
};

type NextMatch = MatchCommon & {};

type LastMatch = MatchCommon & {
  homeScore: number | null;
  awayScore: number | null;
};

type MatchesData = {
  next?: NextMatch | null;
  upcoming?: NextMatch[]; // include next as first item when available
  last?: LastMatch | null;
  source: "football-data" | "thesportsdb";
};

type StandingRow = {
  position: number;
  team: string;
  crest?: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  gd: number;
  pts: number;
};

const LFC_NAME = "Liverpool";
const LFC_DISPLAY_NAME = "Liverpool FC";
const LFC_FOOTBALLDATA_TEAM_ID = 64;
const LFC_THESPORTSDB_TEAM_ID = 133602;

const EPL_COLOR = Color.Purple;
const UCL_COLOR: Color.ColorLike = {
  light: "#0B2F7A",
  dark: "#87A2FF",
  adjustContrast: true,
};

export default function LiverpoolCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [state, setState] = useState<{
    loading: boolean;
    data?: MatchesData | null;
    error?: string | null;
  }>({ loading: true });
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchMatches(prefs);
        if (!isMounted) return;
        setState({ loading: false, data });
      } catch (e: any) {
        const message = e?.message || "Failed to load matches";
        if (!isMounted) return;
        setState({ loading: false, error: message });
        showToast({ style: Toast.Style.Failure, title: "Error", message });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const next = state.data?.next ?? null;
  const upcoming = state.data?.upcoming ?? [];
  const last = state.data?.last ?? null;

  const doRefresh = async () => {
    try {
      setState((s) => ({ ...s, loading: true }));
      const data = await fetchMatches(prefs, true);
      setState({ loading: false, data });
      showToast({ style: Toast.Style.Success, title: "Refreshed" });
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Refresh failed",
        message: String(e?.message || e),
      });
      setState((s) => ({ ...s, loading: false }));
    }
  };

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Liverpool FC">
      <List.Item
        id="next"
        icon={Icon.SoccerBall}
        title="Next Match"
        subtitle={next ? formatNextTitle(next) : "No upcoming match"}
        accessories={next?.utcDate ? [{ text: formatManila(next.utcDate) }] : []}
        actions={
          <ActionPanel>
            <Action
              title="Open Next Match"
              onAction={() => push(<NextMatchDetail data={state.data ?? undefined} />)}
            />
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={doRefresh}
            />
          </ActionPanel>
        }
      />
      <List.Item
        id="fixtures"
        icon={Icon.List}
        title="Upcoming Fixtures"
        subtitle={
          (next ? 1 : 0) + (upcoming?.length ?? 0) > 0
            ? `${(next ? 1 : 0) + (upcoming?.length ?? 0)} fixtures`
            : "No fixtures"
        }
        actions={
          <ActionPanel>
            <Action
              title="Open Fixtures"
              onAction={() => push(<FixturesList data={state.data} />)}
            />
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={doRefresh}
            />
          </ActionPanel>
        }
      />
      <List.Item
        id="news"
        icon={Icon.Globe}
        title="Liverpool FC News"
        subtitle="liverpoolnews.co"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://liverpoolnews.co/?utm_source=raycast&utm_medium=extension&utm_campaign=liverpool" />
            <Action.CopyToClipboard content="https://liverpoolnews.co/?utm_source=raycast&utm_medium=extension&utm_campaign=liverpool" />
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={doRefresh}
            />
          </ActionPanel>
        }
      />

      <List.Item
        id="pl-table"
        icon={Icon.BarChart}
        title="Premier League Table"
        subtitle="Standings"
        actions={
          <ActionPanel>
            <Action title="Open Table" onAction={() => push(<PLTableDetail />)} />
          </ActionPanel>
        }
      />

      <List.Item
        id="ucl-table"
        icon={Icon.Trophy}
        title="Champions League Table"
        subtitle="Standings"
        actions={
          <ActionPanel>
            <Action title="Open Group" onAction={() => push(<UCLTableDetail />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function NextMatchDetail({ data }: { data?: MatchesData | null }) {
  const [local, setLocal] = useState<MatchesData | null | undefined>(data);
  const next = local?.next ?? null;
  const upcoming = local?.upcoming ?? [];
  const last = local?.last ?? null;
  const markdown = buildMarkdown(next, upcoming, last, local?.source ?? null);
  const prefs = getPreferenceValues<Preferences>();
  return (
    <Detail
      markdown={markdown}
      metadata={buildMetadata(next, upcoming, last, local?.source ?? null)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Next Match Time (PHT)"
            content={next?.utcDate ? formatManila(next.utcDate) : "TBD"}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              const fresh = await fetchMatches(prefs, true);
              setLocal(fresh);
              showToast({ style: Toast.Style.Success, title: "Refreshed" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function FixturesDetail({ data }: { data?: MatchesData | null }) {
  const prefs = getPreferenceValues<Preferences>();
  const [local, setLocal] = useState<MatchesData | null | undefined>(data);

  // debug removed

  useEffect(() => {
    (async () => {
      const currentUpcoming = [local?.next, ...(local?.upcoming ?? [])].filter(
        Boolean,
      ) as NextMatch[];
      if (currentUpcoming.length <= 1) {
        try {
          const alt = await fetchFromTheSportsDB(prefs.sportsDbKey);
          const merged = mergeUpcoming(
            local?.next ?? null,
            local?.upcoming ?? [],
            alt.next ?? null,
            alt.upcoming ?? [],
          );
          setLocal({
            ...(local || {}),
            next: merged.next ?? local?.next,
            upcoming: merged.upcoming,
            source: local?.source || alt.source,
          });
        } catch (e) {
          showToast({
            style: Toast.Style.Failure,
            title: "Warning",
            message: "Could not fetch additional fixtures",
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate upcoming AFTER potential state updates
  const upcoming = [local?.next, ...(local?.upcoming ?? [])].filter(Boolean) as NextMatch[];

  const md: string[] = [];
  md.push(`# Upcoming Fixtures`);

  // debug removed

  if (upcoming.length) {
    const tableLines: string[] = [];
    tableLines.push(`| Date (PHT) | Fixture | Comp | H/A | Venue/City |`);
    tableLines.push(`|:--|:--|:--|:--:|:--|`);
    for (const m of upcoming) {
      const date = escapeTableCell(m.utcDate ? formatManila(m.utcDate) : "TBD");
      const fixture = escapeTableCell(formatNextTitle(m));
      const comp = escapeTableCell(m.competition || "");
      const ha = m.isHome ? "H" : "A";
      const vc = escapeTableCell(displayVenueCity(m));
      tableLines.push(`| ${date} | ${fixture} | ${comp} | ${ha} | ${vc} |`);
    }
    md.push(tableLines.join("\n"));
  } else {
    md.push("No upcoming fixtures found.");
  }
  return (
    <Detail
      markdown={md.join("\n\n")}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              const fresh = await fetchMatches(prefs, true);
              setLocal(fresh);
              showToast({ style: Toast.Style.Success, title: "Refreshed" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function FixturesList({ data }: { data?: MatchesData | null }) {
  const prefs = getPreferenceValues<Preferences>();
  const [local, setLocal] = useState<MatchesData | null | undefined>(data);
  const [loading, setLoading] = useState(false);
  const timezone = prefs.timezone || "Asia/Manila";
  const [badges, setBadges] = useState<Record<string, string | null>>(() =>
    collectOpponentBadges([data?.next, ...(data?.upcoming ?? [])].filter(Boolean) as NextMatch[]),
  );
  const [groupBy, setGroupBy] = useState<"month" | "competition" | "none">("month");
  const [compFilter, setCompFilter] = useState<string>("ALL");
  const [haFilter, setHaFilter] = useState<"ALL" | "H" | "A">("ALL");

  const fixtures = [local?.next, ...(local?.upcoming ?? [])].filter(Boolean) as NextMatch[];

  useEffect(() => {
    if (!local) return;
    const matches = [local.next, ...(local.upcoming ?? [])].filter(Boolean) as NextMatch[];
    if (matches.length === 0) return;
    setBadges((prev) => {
      let next: Record<string, string | null> | null = null;
      for (const match of matches) {
        const opponent = (match.isHome ? match.awayTeam : match.homeTeam) || "";
        const crest = (match.isHome ? match.awayBadge : match.homeBadge) ?? null;
        if (opponent && crest && prev[opponent] !== crest) {
          if (!next) next = { ...prev };
          next[opponent] = crest;
        }
      }
      return next ?? prev;
    });
  }, [local]);

  useEffect(() => {
    (async () => {
      if (fixtures.length <= 1) {
        try {
          setLoading(true);
          const alt = await fetchFromTheSportsDB(prefs.sportsDbKey);
          const merged = mergeUpcoming(
            local?.next ?? null,
            local?.upcoming ?? [],
            alt.next ?? null,
            alt.upcoming ?? [],
          );
          setLocal({
            ...(local || {}),
            next: merged.next ?? local?.next,
            upcoming: merged.upcoming,
            source: local?.source || alt.source,
          });
        } catch (e) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = [local?.next, ...(local?.upcoming ?? [])].filter(Boolean) as NextMatch[];

  useEffect(() => {
    (async () => {
      const teams = new Set<string>();
      for (const m of items) {
        const opponent = (m.isHome ? m.awayTeam : m.homeTeam) || "";
        if (!opponent) continue;
        const crest = (m.isHome ? m.awayBadge : m.homeBadge) ?? null;
        if (crest) continue;
        if (badges[opponent]) continue;
        teams.add(opponent);
      }
      const toFetch = Array.from(teams);
      if (toFetch.length === 0) return;
      const results: Record<string, string | null> = {};
      await Promise.all(
        toFetch.map(async (t) => {
          try {
            results[t] = await getTeamBadge(t, prefs.sportsDbKey);
          } catch {
            results[t] = null;
          }
        }),
      );
      setBadges((b) => ({ ...b, ...results }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Fallback: use football-data.org crests (PL + UCL group) when available
  useEffect(() => {
    (async () => {
      if (!prefs.footballDataKey) return;
      const need: string[] = [];
      for (const m of items) {
        const name = (m.isHome ? m.awayTeam : m.homeTeam) || "";
        if (name && !badges[name]) need.push(name);
      }
      if (need.length === 0) return;
      const results: Record<string, string | null> = {};
      try {
        const rows = await fetchPLStandings(prefs);
        for (const r of rows) {
          if (r.crest && need.includes(r.team)) results[r.team] = r.crest;
        }
      } catch {}
      try {
        const g = await fetchUCLGroup(prefs);
        for (const r of g.rows) {
          if (r.crest && need.includes(r.team)) results[r.team] = r.crest;
        }
      } catch {}
      if (Object.keys(results).length) setBadges((b) => ({ ...b, ...results }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, prefs.footballDataKey]);

  // Build filters & grouping
  const uniqueComps = Array.from(
    new Set(items.map((i) => i.competition).filter(Boolean)),
  ) as string[];
  const filtered = items.filter((m) => {
    if (compFilter !== "ALL" && (m.competition || "") !== compFilter) return false;
    if (haFilter !== "ALL" && (m.isHome ? "H" : "A") !== haFilter) return false;
    return true;
  });
  const monthKey = (iso?: string | null) => {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
  };
  const compKey = (m: NextMatch) => m.competition || "Other";
  const grouped = new Map<string, NextMatch[]>();
  for (const m of filtered) {
    const k =
      groupBy === "competition"
        ? compKey(m)
        : groupBy === "month"
          ? monthKey(m.utcDate)
          : "All Fixtures";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(m);
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search fixtures"
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Group By" storeValue onChange={(v) => setGroupBy(v as any)}>
            <List.Dropdown.Item title="By Month" value="month" />
            <List.Dropdown.Item title="By Competition" value="competition" />
            <List.Dropdown.Item title="No Grouping" value="none" />
          </List.Dropdown>
          <List.Dropdown tooltip="Competition" storeValue onChange={(v) => setCompFilter(v)}>
            <List.Dropdown.Item title="All Competitions" value="ALL" />
            {uniqueComps.map((c) => (
              <List.Dropdown.Item key={c} title={c} value={c} />
            ))}
          </List.Dropdown>
          <List.Dropdown tooltip="Home/Away" storeValue onChange={(v) => setHaFilter(v as any)}>
            <List.Dropdown.Item title="Home & Away" value="ALL" />
            <List.Dropdown.Item title="Home" value="H" />
            <List.Dropdown.Item title="Away" value="A" />
          </List.Dropdown>
        </>
      }
    >
      {Array.from(grouped.entries()).map(([title, arr]) => (
        <List.Section key={title} title={title}>
          {arr.map((m, idx) => {
            const opponent = (m.isHome ? m.awayTeam : m.homeTeam) || "";
            const directBadge = (m.isHome ? m.awayBadge : m.homeBadge) ?? null;
            const storedBadge = badges[opponent] || null;
            const badgeUrl = directBadge || storedBadge;
            const iconSource = badgeUrl
              ? { source: badgeUrl }
              : m.isHome
                ? Icon.House
                : Icon.Airplane;
            return (
              <List.Item
                key={`${title}-${idx}`}
                icon={iconSource}
                title={formatNextTitle(m)}
                accessories={
                  [
                    m.utcDate ? { text: formatTime(m.utcDate, timezone) } : { text: "TBD" },
                    m.competition
                      ? {
                          tag: {
                            value: compAbbrev(m.competition),
                            color: competitionColor(m.competition),
                          },
                        }
                      : undefined,
                    {
                      tag: {
                        value: m.isHome ? "Home" : "Away",
                        color: m.isHome ? Color.Green : Color.Red,
                      },
                    },
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh Data"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={async () => {
                        setLoading(true);
                        const fresh = await fetchMatches(prefs, true);
                        setLocal(fresh);
                        setLoading(false);
                        showToast({ style: Toast.Style.Success, title: "Refreshed" });
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function NewsList() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<
    Array<{ title: string; link: string; date?: string; source?: string }>
  >([]);
  useEffect(() => {
    (async () => {
      try {
        const news = await fetchNews();
        setItems(news);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "News Error", message: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <List isLoading={loading} searchBarPlaceholder="Liverpool FC news">
      {items.map((n, idx) => (
        <List.Item
          key={idx}
          icon={Icon.Newspaper}
          title={n.title}
          accessories={
            [
              n.source ? { tag: n.source } : undefined,
              n.date ? { date: new Date(n.date) } : undefined,
            ].filter(Boolean) as any
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={n.link} />
              <Action.CopyToClipboard content={n.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PLTableDetail() {
  const prefs = getPreferenceValues<Preferences>();
  const [rows, setRows] = useState<StandingRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPLStandings(prefs);
        setRows(data);
      } catch (e: any) {
        showToast({
          style: Toast.Style.Failure,
          title: "Standings Error",
          message: String(e?.message || e),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const items = rows ?? [];
  const prefsLocal = getPreferenceValues<Preferences>();
  if (!prefsLocal.listStandings) {
    const md = buildStandingsMarkdown("Premier League", rows, {
      highlightTop: 4,
      topLabel: "Champions League",
      highlightBottom: 3,
    });
    return (
      <Detail
        isLoading={loading}
        markdown={md}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                setLoading(true);
                setRows(await fetchPLStandings(prefs, true));
                setLoading(false);
                showToast({ style: Toast.Style.Success, title: "Refreshed" });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List isLoading={loading} searchBarPlaceholder="Search PL table">
      {(() => {
        const relegationStart = Math.max(1, items.length - 3 + 1);
        const top4 = items.filter((r) => r.position <= 4);
        const europa = items.filter((r) => r.position === 5);
        const middle = items.filter((r) => r.position > 5 && r.position < relegationStart);
        const bottom = items.filter((r) => r.position >= relegationStart);

        const renderItem = (r: StandingRow) => {
          const isBottom3 = r.position >= relegationStart;
          const accessories: List.Item.Accessory[] = [
            { tag: `P ${r.played}` },
            { tag: `W ${r.won}` },
            { tag: `D ${r.draw}` },
            { tag: `L ${r.lost}` },
            {
              tag: {
                value: `GD ${r.gd > 0 ? "+" : ""}${r.gd}`,
                color: r.gd > 0 ? Color.Green : r.gd < 0 ? Color.Red : Color.SecondaryText,
              },
            },
            {
              tag: {
                value: `Pts ${r.pts}`,
                color: isBottom3
                  ? Color.Red
                  : r.position <= 4
                    ? Color.Green
                    : r.position === 5
                      ? Color.Orange
                      : Color.SecondaryText,
              },
            },
          ];
          return (
            <List.Item
              key={r.team}
              icon={r.crest ? { source: r.crest } : Icon.Trophy}
              title={`${r.position}. ${r.team}`}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Data"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setLoading(true);
                      setRows(await fetchPLStandings(prefs, true));
                      setLoading(false);
                      showToast({ style: Toast.Style.Success, title: "Refreshed" });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        };

        return (
          <>
            <List.Section title="Champions League (Top 4)">
              {top4.map((r) => renderItem(r))}
            </List.Section>
            {europa.length > 0 && (
              <List.Section title="Europa League (5th)">
                {europa.map((r) => renderItem(r))}
              </List.Section>
            )}
            <List.Section title="Table">{middle.map((r) => renderItem(r))}</List.Section>
            {bottom.length > 0 && (
              <List.Section title="Bottom 3">{bottom.map((r) => renderItem(r))}</List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}

function UCLTableDetail() {
  const prefs = getPreferenceValues<Preferences>();
  const [group, setGroup] = useState<{ name: string; rows: StandingRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchUCLGroup(prefs);
        setGroup(data);
      } catch (e: any) {
        showToast({
          style: Toast.Style.Failure,
          title: "Standings Error",
          message: String(e?.message || e),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const rows = group?.rows ?? [];
  const prefsLocal = getPreferenceValues<Preferences>();
  if (!prefsLocal.listStandings) {
    const md = group
      ? buildStandingsMarkdown(`Champions League — ${group.name}`, group.rows, {
          highlightTop: 8,
          highlightBottom: 12,
          topLabel: "Top 8",
          midLabel: "Playoff",
          bottomLabel: "Elimination zone",
          bottomIcon: "⛔",
        })
      : "Loading...";
    return (
      <Detail
        isLoading={loading}
        markdown={md}
        navigationTitle="UCL"
        actions={
          <ActionPanel>
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                setLoading(true);
                setGroup(await fetchUCLGroup(prefs, true));
                setLoading(false);
                showToast({ style: Toast.Style.Success, title: "Refreshed" });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List isLoading={loading} searchBarPlaceholder="Search UCL" navigationTitle="UCL">
      {(() => {
        const top = rows.filter((r) => r.position <= 8);
        const mid = rows.filter((r) => r.position > 8 && r.position <= 24);
        const bottom = rows.filter((r) => r.position >= 25);

        const renderItem = (r: StandingRow) => {
          const accessories: List.Item.Accessory[] = [
            { tag: `P ${r.played}` },
            { tag: `W ${r.won}` },
            { tag: `D ${r.draw}` },
            { tag: `L ${r.lost}` },
            {
              tag: {
                value: `GD ${r.gd > 0 ? "+" : ""}${r.gd}`,
                color: r.gd > 0 ? Color.Green : r.gd < 0 ? Color.Red : Color.SecondaryText,
              },
            },
            {
              tag: {
                value: `Pts ${r.pts}`,
                color:
                  r.position <= 8
                    ? Color.Green
                    : r.position >= 25
                      ? Color.Red
                      : Color.SecondaryText,
              },
            },
          ];
          return (
            <List.Item
              key={r.team}
              icon={r.crest ? { source: r.crest } : Icon.Trophy}
              title={`${r.position}. ${r.team}`}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Data"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setLoading(true);
                      setGroup(await fetchUCLGroup(prefs, true));
                      setLoading(false);
                      showToast({ style: Toast.Style.Success, title: "Refreshed" });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        };

        return (
          <>
            <List.Section title="Top 8">{top.map(renderItem)}</List.Section>
            {mid.length > 0 && <List.Section title="Playoff">{mid.map(renderItem)}</List.Section>}
            {bottom.length > 0 && (
              <List.Section title="Elimination Zone">{bottom.map(renderItem)}</List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}

async function fetchMatches(prefs: Preferences, force = false): Promise<MatchesData> {
  const useFootballData = Boolean(prefs.footballDataKey);
  if (useFootballData) {
    try {
      const data = force
        ? await fetchFromFootballData(prefs.footballDataKey!, prefs.sportsDbKey)
        : await withCache(() => fetchFromFootballData(prefs.footballDataKey!, prefs.sportsDbKey), {
            maxAge: 5 * 60 * 1000,
          })();
      if (!("upcoming" in data)) {
        return await fetchFromFootballData(prefs.footballDataKey!, prefs.sportsDbKey);
      }
      return data;
    } catch (e) {
      // fall through to sportsdb
    }
  }
  const data = force
    ? await fetchFromTheSportsDB(prefs.sportsDbKey)
    : await withCache(() => fetchFromTheSportsDB(prefs.sportsDbKey), { maxAge: 5 * 60 * 1000 })();
  if (!("upcoming" in data) || ((data as any).upcoming?.length === 0 && data.next)) {
    return await fetchFromTheSportsDB(prefs.sportsDbKey);
  }
  return data;
}

async function fetchNews() {
  const url = "https://news.google.com/rss/search?q=Liverpool%20FC&hl=en-US&gl=US&ceid=US:en";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`news ${res.status}`);
  const xml = await res.text();
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, 20);
  function get(tag: string, s: string) {
    const m = s.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!m) return null;
    return m[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").trim();
  }
  return items.map((m) => {
    const chunk = m[1];
    const title = get("title", chunk) || "Untitled";
    const link = get("link", chunk) || "";
    const date = get("pubDate", chunk) || undefined;
    const src = get("source", chunk) || undefined;
    return { title, link, date, source: src };
  });
}

async function fetchFromFootballData(apiKey: string, sportsDbKey?: string): Promise<MatchesData> {
  const headers = { "X-Auth-Token": apiKey };
  const today = new Date();
  const dateFrom = today.toISOString().slice(0, 10);
  const dateTo = new Date(today.getTime() + 365 * 24 * 3600 * 1000) // +365 days
    .toISOString()
    .slice(0, 10);

  // Fetch a window of future matches to populate upcoming fixtures
  const nextRes = await fetch(
    `https://api.football-data.org/v4/teams/${LFC_FOOTBALLDATA_TEAM_ID}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=200`,
    { headers },
  );
  if (!nextRes.ok) throw new Error(`football-data next: ${nextRes.status}`);
  const nextJson = (await nextRes.json()) as { matches: any[] };

  let upcomingSorted = nextJson.matches
    .filter((m) => ["SCHEDULED", "TIMED", "POSTPONED"].includes(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  // If API window returned too few, fall back to status-based fetch
  if (upcomingSorted.length < 2) {
    const statuses = ["SCHEDULED", "TIMED"] as const;
    const extra: any[] = [];
    for (const st of statuses) {
      const r = await fetch(
        `https://api.football-data.org/v4/teams/${LFC_FOOTBALLDATA_TEAM_ID}/matches?status=${st}&limit=50`,
        { headers },
      );
      if (r.ok) {
        const j = (await r.json()) as { matches: any[] };
        extra.push(...j.matches);
      }
    }
    upcomingSorted = extra
      .filter((m) => new Date(m.utcDate).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  }

  let upcomingArr: NextMatch[] = upcomingSorted.map((m) => ({
    utcDate: m.utcDate ?? null,
    competition: m.competition?.name ?? null,
    isHome: m.homeTeam?.id === LFC_FOOTBALLDATA_TEAM_ID,
    homeTeam: m.homeTeam?.name ?? "",
    awayTeam: m.awayTeam?.name ?? "",
    venue: null,
    city: null,
    homeBadge: m.homeTeam?.crest ?? null,
    awayBadge: m.awayTeam?.crest ?? null,
    status: m.status ?? null,
  }));

  let next: NextMatch | null = upcomingArr[0] ?? null;
  if (next) {
    // Fallback if crest missing from football-data (edge cases)
    if (!next.homeBadge) next.homeBadge = await getTeamBadge(next.homeTeam);
    if (!next.awayBadge) next.awayBadge = await getTeamBadge(next.awayTeam);
  }
  const listWithoutHero = next ? upcomingArr.slice(1) : upcomingArr;

  const lastRes = await fetch(
    `https://api.football-data.org/v4/teams/${LFC_FOOTBALLDATA_TEAM_ID}/matches?status=FINISHED&limit=50`,
    { headers },
  );
  if (!lastRes.ok) throw new Error(`football-data last: ${lastRes.status}`);
  const lastJson = (await lastRes.json()) as { matches: any[] };
  const recent = lastJson.matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())[0];

  const last: LastMatch | null = recent
    ? {
        utcDate: recent.utcDate ?? null,
        competition: recent.competition?.name ?? null,
        isHome: recent.homeTeam?.id === LFC_FOOTBALLDATA_TEAM_ID,
        homeTeam: recent.homeTeam?.name ?? "",
        awayTeam: recent.awayTeam?.name ?? "",
        venue: null,
        status: recent.status ?? null,
        homeScore: recent.score?.fullTime?.home ?? null,
        awayScore: recent.score?.fullTime?.away ?? null,
      }
    : null;

  // If we still have too few fixtures (common early in a season draw), augment with TheSportsDB
  let upcomingFinal = listWithoutHero;
  if (upcomingFinal.length < 4) {
    try {
      const alt = await fetchFromTheSportsDB(sportsDbKey);
      const merged = mergeUpcoming(next, upcomingFinal, alt.next ?? null, alt.upcoming ?? []);
      next = merged.next;
      upcomingFinal = merged.upcoming;
    } catch (e) {
      // ignore; keep football-data only
    }
  }

  return { next, upcoming: upcomingFinal, last, source: "football-data" };
}

async function fetchFromTheSportsDB(apiKey?: string): Promise<MatchesData> {
  const key = apiKey?.trim() || "123";
  const base = `https://www.thesportsdb.com/api/v1/json/${key}`;

  const [nextRes, lastRes] = await Promise.all([
    fetch(`${base}/eventsnext.php?id=${LFC_THESPORTSDB_TEAM_ID}`),
    fetch(`${base}/eventslast.php?id=${LFC_THESPORTSDB_TEAM_ID}`),
  ]);
  if (!nextRes.ok) throw new Error(`TheSportsDB next: ${nextRes.status}`);
  if (!lastRes.ok) throw new Error(`TheSportsDB last: ${lastRes.status}`);

  const nextJson = (await nextRes.json()) as { events?: any[] | null };
  const lastJson = (await lastRes.json()) as { results?: any[] | null };

  const nextEvents = (nextJson.events || []).filter(Boolean);
  const upcomingAll: NextMatch[] = nextEvents.slice(0, 6).map((ev: any) => ({
    utcDate: toISO(ev.strTimestamp) || combineDateTimeToUTC(ev.dateEvent, ev.strTime),
    competition: ev.strLeague || ev.strLeagueShort || null,
    isHome: (ev.strHomeTeam || "").toLowerCase() === LFC_NAME.toLowerCase(),
    homeTeam: ev.strHomeTeam || "",
    awayTeam: ev.strAwayTeam || "",
    venue: ev.strVenue || null,
    city: ev.strCity || ev.strVenueLocation || null,
    status: ev.strStatus || null,
  }));

  const next: NextMatch | null = upcomingAll[0] ?? null;
  const listWithoutHero = next ? upcomingAll.slice(1, 6) : upcomingAll.slice(0, 5);
  if (next) {
    const [hb, ab] = await Promise.all([
      getTeamBadge(next.homeTeam, apiKey),
      getTeamBadge(next.awayTeam, apiKey),
    ]);
    next.homeBadge = hb;
    next.awayBadge = ab;
  }

  const lastEvent = (lastJson.results || []).filter(Boolean)[0];
  const last: LastMatch | null = lastEvent
    ? {
        utcDate:
          toISO(lastEvent.strTimestamp) ||
          combineDateTimeToUTC(lastEvent.dateEvent, lastEvent.strTime),
        competition: lastEvent.strLeague || lastEvent.strLeagueShort || null,
        isHome: (lastEvent.strHomeTeam || "").toLowerCase() === LFC_NAME.toLowerCase(),
        homeTeam: lastEvent.strHomeTeam || "",
        awayTeam: lastEvent.strAwayTeam || "",
        venue: lastEvent.strVenue || null,
        city: lastEvent.strCity || lastEvent.strVenueLocation || null,
        status: lastEvent.strStatus || null,
        homeScore: toInt(lastEvent.intHomeScore),
        awayScore: toInt(lastEvent.intAwayScore),
      }
    : null;

  return { next, upcoming: listWithoutHero, last, source: "thesportsdb" };
}

function mergeUpcoming(
  nextA: NextMatch | null,
  arrA: NextMatch[],
  nextB: NextMatch | null,
  arrB: NextMatch[],
): { next: NextMatch | null; upcoming: NextMatch[] } {
  const map = new Map<string, NextMatch>();
  function key(m: NextMatch) {
    const iso = (m.utcDate || "").slice(0, 16); // minute precision
    const a = (m.homeTeam || "").toLowerCase();
    const b = (m.awayTeam || "").toLowerCase();
    return `${iso}|${a}|${b}`;
  }
  const push = (m?: NextMatch | null) => {
    if (!m) return;
    map.set(key(m), m);
  };
  push(nextA);
  arrA.forEach(push);
  push(nextB);
  arrB.forEach(push);
  // Sort ascending by date
  const all = Array.from(map.values())
    .filter((m) => m.utcDate)
    .sort((x, y) => new Date(x.utcDate!).getTime() - new Date(y.utcDate!).getTime());
  const next = all[0] ?? null;
  const upcoming = all.slice(1, 6);
  return { next, upcoming };
}

function collectOpponentBadges(matches: NextMatch[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const match of matches) {
    const opponent = (match.isHome ? match.awayTeam : match.homeTeam) || "";
    const crest = (match.isHome ? match.awayBadge : match.homeBadge) ?? null;
    if (opponent && crest) {
      map[opponent] = crest;
    }
  }
  return map;
}

function formatNextTitle(m: NextMatch): string {
  if (m.isHome) return `${LFC_DISPLAY_NAME} vs ${m.awayTeam}`;
  return `${m.homeTeam} vs ${LFC_DISPLAY_NAME}`;
}

function formatLastTitle(m: LastMatch): string {
  const scoreStr = scoreStringSafe(m);
  if (m.isHome) return `${LFC_DISPLAY_NAME} ${scoreStr} ${m.awayTeam}`;
  return `${m.homeTeam} ${scoreStr} ${LFC_DISPLAY_NAME}`;
}

function scoreStringSafe(m: LastMatch): string {
  const hs = m.homeScore;
  const as = m.awayScore;
  if (hs == null || as == null) return "-";
  return `${hs}-${as}`;
}

function buildMarkdown(
  next: NextMatch | null,
  upcoming: NextMatch[],
  last: LastMatch | null,
  source: MatchesData["source"] | null,
): string {
  const md: string[] = [];

  if (next) {
    const title = escapeMd(formatNextTitle(next));
    const when = next.utcDate ? escapeMd(formatManila(next.utcDate)) : "TBD";
    const comp = next.competition ? `\n_${escapeMd(next.competition)}_` : "";
    const venueCity = displayVenueCity(next);
    const venueLine = venueCity ? `\n_${escapeMd(venueCity)}_` : "";
    // Hero with crests side-by-side (markdown inline images) + names below
    const leftImg = next.homeBadge ? `![H](${next.homeBadge}?raycast-height=72)` : "🔴";
    const rightImg = next.awayBadge ? `![A](${next.awayBadge}?raycast-height=72)` : "⚽️";
    const logosLine = `${leftImg}   **vs**   ${rightImg}`;
    const namesTable = `| ${escapeMd(next.homeTeam)} | vs | ${escapeMd(next.awayTeam)} |\n|:--:|:--:|:--:|`;
    md.push(`# ${title}\n\n**${when}**${venueLine}${comp}\n\n${logosLine}\n\n${namesTable}`);
  } else {
    md.push(`# No Upcoming Match`);
  }

  // The rest (upcoming list, last match, source) is rendered via Detail.Metadata to add color tags and icons.

  return md.join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/[|*_#`]/g, (c) => `\\${c}`);
}
function escapeTableCell(s: string): string {
  return s.replace(/[*_#`]/g, (c) => `\\${c}`);
}

function displayVenueCity(m: MatchCommon): string {
  const venue = m.venue || (m.isHome ? "Anfield" : "");
  const city = m.city || (m.isHome ? "Liverpool" : "");
  if (venue && city) return `${venue}, ${city}`;
  return venue || city || "";
}

function formatTime(iso: string, timezone: string = "Asia/Manila"): string {
  try {
    const eventDate = new Date(iso);
    if (isNaN(eventDate.getTime())) return "TBD";

    const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone });
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: timezone,
    });
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });

    const eventParts = getLocalDateParts(eventDate, timezone);
    const nowParts = getLocalDateParts(new Date(), timezone);
    let prefix: string | null = null;
    if (
      [
        eventParts.year,
        eventParts.month,
        eventParts.day,
        nowParts.year,
        nowParts.month,
        nowParts.day,
      ].every((n) => Number.isFinite(n))
    ) {
      const millisPerDay = 24 * 60 * 60 * 1000;
      const eventDayValue = Date.UTC(eventParts.year, eventParts.month - 1, eventParts.day);
      const nowDayValue = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
      const dayDiff = Math.round((eventDayValue - nowDayValue) / millisPerDay);

      if (dayDiff === 0) {
        const eventHour = getLocalHour(eventDate, timezone);
        prefix = eventHour >= 18 ? "Tonight" : "Today";
      } else if (dayDiff === 1) {
        prefix = "Tomorrow";
      }
    }

    const time = timeFormatter.format(eventDate);

    // Get timezone abbreviation
    const tzName =
      new Intl.DateTimeFormat("en", {
        timeZoneName: "short",
        timeZone: timezone,
      })
        .formatToParts(eventDate)
        .find((part) => part.type === "timeZoneName")?.value || "";

    const dayLabel =
      prefix ?? `${dayFormatter.format(eventDate)}, ${dateFormatter.format(eventDate)}`;
    return `${dayLabel} · ${time} ${tzName}`;
  } catch {
    return "TBD";
  }
}

// Keep backward compatibility
function formatManila(iso: string): string {
  return formatTime(iso, "Asia/Manila");
}

function getLocalDateParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? NaN);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? NaN);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? NaN);
  return { year, month, day };
}

function getLocalHour(date: Date, timezone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(date);
  const hour = Number.parseInt(hourStr, 10);
  return Number.isFinite(hour) ? hour : 0;
}

function toISO(ts?: string | null): string | null {
  if (!ts || typeof ts !== "string") return null;
  let iso = ts.trim().replace(" ", "T");
  // If no timezone info present, assume UTC to avoid local-time misparsing
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += "Z";
  }
  return iso;
}

function combineDateTimeToUTC(date?: string | null, time?: string | null): string | null {
  if (!date || !time) return date ?? null;
  const t = time.length === 5 ? `${time}:00` : time; // HH:mm -> HH:mm:ss
  return `${date}T${t}Z`;
}

function toInt(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Simple in-memory badge cache per session
const badgeCache = new Map<string, string | null>();
async function getTeamBadge(teamName: string, sportsDbKey?: string): Promise<string | null> {
  const apiKey = sportsDbKey?.trim() || "123";
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/\b(football club|club|fc|cf|de)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  const mapSyn: Record<string, string> = {
    "club atletico de madrid": "atletico madrid",
    "atletico de madrid": "atletico madrid",
    "atlético madrid": "atletico madrid",
    "sport lisboa e benfica": "benfica",
    "sporting clube de portugal": "sporting cp",
    "olympique de marseille": "olympique marseille",
    "galatasaray sk": "galatasaray",
    psv: "psv eindhoven",
    "athletic club": "athletic bilbao",
    "ssc napoli": "napoli",
    "crystal palace fc": "crystal palace",
    "chelsea fc": "chelsea",
    "brentford fc": "brentford",
    "villarreal cf": "villarreal",
  };
  const base = teamName || "";
  const candidates = Array.from(
    new Set(
      [
        base,
        norm(base),
        mapSyn[norm(base).toLowerCase()] || "",
        norm(base).replace(/madrid$/i, "madrid"),
      ].filter(Boolean),
    ),
  );
  for (const cand of candidates) {
    const cacheKey = `${apiKey}|${cand.toLowerCase()}`;
    if (badgeCache.has(cacheKey)) {
      const v = badgeCache.get(cacheKey) ?? null;
      if (v) return v;
      continue;
    }
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(cand)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { teams?: any[] };
      const team = (json.teams || [])[0];
      const badge: string | null = team?.strTeamBadge || team?.strTeamLogo || null;
      badgeCache.set(cacheKey, badge ?? null);
      if (badge) return badge;
    } catch {
      badgeCache.set(cacheKey, null);
    }
  }
  // Final fallback: no URL
  return null;
}

function buildMetadata(
  next: NextMatch | null,
  upcoming: NextMatch[],
  last: LastMatch | null,
  source: MatchesData["source"] | null,
) {
  return (
    <Detail.Metadata>
      {next ? (
        <>
          <Detail.Metadata.Label title="Next Match" text="" />
          <Detail.Metadata.Label
            title="Kickoff (Manila)"
            text={next.utcDate ? formatManila(next.utcDate) : "TBD"}
          />
          {displayVenueCity(next) ? (
            <Detail.Metadata.Label title="Venue" text={displayVenueCity(next)} />
          ) : null}
          {next.utcDate ? (
            <Detail.Metadata.TagList title="Countdown">
              <Detail.Metadata.TagList.Item
                text={formatCountdown(next.utcDate)}
                color={countdownColor(next.utcDate)}
              />
            </Detail.Metadata.TagList>
          ) : null}
          {next.competition ? (
            <Detail.Metadata.TagList title="Competition">
              <Detail.Metadata.TagList.Item
                text={next.competition}
                color={competitionColor(next.competition)}
              />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.TagList title="Home/Away">
            <Detail.Metadata.TagList.Item
              text={next.isHome ? "Home" : "Away"}
              color={next.isHome ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
        </>
      ) : null}

      {upcoming.length ? (
        <>
          <Detail.Metadata.Label title="Upcoming (Next 5)" text="" />
          {upcoming.flatMap((m, i) => [
            <Detail.Metadata.Label
              key={`u-${i}-label`}
              title={`${homeAwayEmoji(m)} ${formatManila(m.utcDate || "")}`}
              text={`${fixtureWithEmojis(m)}${m.venue || m.city ? ` — ${displayVenueCity(m)}` : ""}`}
            />,
            <Detail.Metadata.TagList key={`u-${i}-tags`} title="Tags">
              {m.competition ? (
                <Detail.Metadata.TagList.Item
                  text={m.competition}
                  color={competitionColor(m.competition)}
                />
              ) : null}
              <Detail.Metadata.TagList.Item
                text={m.isHome ? "H" : "A"}
                color={m.isHome ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>,
          ])}
          <Detail.Metadata.Separator />
        </>
      ) : null}

      {last ? (
        <>
          <Detail.Metadata.Label title="Last Match" text="" />
          <Detail.Metadata.Label title="Result" text={formatLastTitle(last)} />
          <Detail.Metadata.Label
            title="Date (Manila)"
            text={last.utcDate ? formatManila(last.utcDate) : ""}
          />
          {last.competition ? (
            <Detail.Metadata.TagList title="Competition">
              <Detail.Metadata.TagList.Item text={last.competition} color={Color.Orange} />
            </Detail.Metadata.TagList>
          ) : null}
          {resultTag(last)}
          <Detail.Metadata.Separator />
        </>
      ) : null}

      {source ? (
        <Detail.Metadata.TagList title="Source">
          <Detail.Metadata.TagList.Item
            text={source === "football-data" ? "football-data.org" : "TheSportsDB"}
            color={Color.SecondaryText}
          />
        </Detail.Metadata.TagList>
      ) : null}
    </Detail.Metadata>
  );
}

function resultTag(last: LastMatch | null) {
  if (!last) return null;
  const hs = last.homeScore ?? null;
  const as = last.awayScore ?? null;
  if (hs == null || as == null) return null;
  const lfcScored = last.isHome ? hs : as;
  const oppScored = last.isHome ? as : hs;
  const outcome = lfcScored > oppScored ? "Win" : lfcScored < oppScored ? "Loss" : "Draw";
  const color =
    outcome === "Win" ? Color.Green : outcome === "Loss" ? Color.Red : Color.SecondaryText;
  return (
    <Detail.Metadata.TagList title="Result">
      <Detail.Metadata.TagList.Item text={outcome} color={color} />
    </Detail.Metadata.TagList>
  );
}

function competitionColor(name: string): Color.ColorLike {
  const n = name.toLowerCase();
  if (n.includes("premier")) return EPL_COLOR;
  if (n.includes("champions league") || n.includes("uefa champions")) return UCL_COLOR;
  if (n.includes("europa")) return Color.Orange;
  if (n.includes("fa cup")) return Color.Red;
  if (n.includes("carabao") || n.includes("efl") || n.includes("league cup")) return Color.Yellow;
  return Color.Blue;
}

function compAbbrev(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("premier")) return "EPL";
  if (n.includes("champions league") || n.includes("uefa champions")) return "UCL";
  if (n.includes("europa")) return "UEL";
  if (n.includes("conference")) return "UECL";
  if (n.includes("fa cup")) return "FA Cup";
  if (n.includes("carabao") || n.includes("efl") || n.includes("league cup")) return "EFL Cup";
  return name.substring(0, Math.min(10, name.length));
}

function plBandTag(position: number, total: number) {
  if (!Number.isFinite(position) || !Number.isFinite(total) || total <= 0) return undefined;
  if (position <= 4) return { tag: { value: "UCL", color: UCL_COLOR } };
  if (position === 5) return { tag: { value: "UEL", color: Color.Orange } };
  if (position === 6) return { tag: { value: "UECL", color: Color.Blue } };
  if (position >= total - 3 + 1) return { tag: { value: "REL", color: Color.Red } };
  return undefined;
}

function uclBandTag(position: number) {
  if (position <= 2) return { tag: { value: "Advance", color: Color.Green } };
  if (position === 3) return { tag: { value: "UEL", color: Color.Orange } };
  return { tag: { value: "Out", color: Color.SecondaryText } };
}

// (removed duplicate compAbbrev)

function fixtureWithEmojis(m: NextMatch): string {
  const lfc = "🔴 Liverpool FC";
  const opp = m.isHome ? m.awayTeam : m.homeTeam;
  return m.isHome ? `${lfc} vs ${opp}` : `${opp} vs ${lfc}`;
}

function homeAwayEmoji(m: MatchCommon): string {
  return m.isHome ? "🏠" : "✈️";
}

function formatCountdown(iso: string): string {
  const now = Date.now();
  const at = new Date(iso).getTime();
  const diff = at - now;
  if (!isFinite(diff)) return "—";
  if (diff <= 0) return "Live";
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const m = mins % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${m}m`;
  return `in ${m}m`;
}

function countdownColor(iso: string): Color {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return Color.Red;
  const hours = diff / 3600000;
  if (hours < 24) return Color.Red;
  if (hours < 72) return Color.Orange;
  if (hours < 168) return Color.Blue;
  return Color.SecondaryText;
}

// -------- Standings (PL / UCL) ---------
async function fetchPLStandings(prefs: Preferences, force = false): Promise<StandingRow[]> {
  if (!prefs.footballDataKey) throw new Error("Set football-data.org API key in preferences");
  const loader = async () => fetchPLStandingsFD(prefs.footballDataKey!);
  return force ? await loader() : await withCache(loader, { maxAge: 5 * 60 * 1000 })();
}

async function fetchPLStandingsFD(apiKey: string): Promise<StandingRow[]> {
  const headers = { "X-Auth-Token": apiKey };
  const res = await fetch("https://api.football-data.org/v4/competitions/PL/standings", {
    headers,
  });
  if (!res.ok) throw new Error(`PL standings ${res.status}`);
  const json: any = await res.json();
  const table = (json.standings || []).find((s: any) => s.type === "TOTAL")?.table || [];
  return table.map((r: any) => ({
    position: r.position,
    team: r.team?.name || "",
    crest: r.team?.crest || null,
    played: r.playedGames ?? r.played ?? 0,
    won: r.won ?? 0,
    draw: r.draw ?? 0,
    lost: r.lost ?? 0,
    gd: r.goalDifference ?? (r.goalsFor ?? 0) - (r.goalsAgainst ?? 0),
    pts: r.points ?? 0,
  }));
}

async function fetchUCLGroup(
  prefs: Preferences,
  force = false,
): Promise<{ name: string; rows: StandingRow[] }> {
  if (!prefs.footballDataKey) throw new Error("Set football-data.org API key in preferences");
  const loader = async () => fetchUCLGroupFD(prefs.footballDataKey!);
  return force ? await loader() : await withCache(loader, { maxAge: 5 * 60 * 1000 })();
}

async function fetchUCLGroupFD(apiKey: string): Promise<{ name: string; rows: StandingRow[] }> {
  const headers = { "X-Auth-Token": apiKey };
  const res = await fetch("https://api.football-data.org/v4/competitions/CL/standings", {
    headers,
  });
  if (!res.ok) throw new Error(`UCL standings ${res.status}`);
  const json: any = await res.json();
  const groups: any[] = (json.standings || []).filter((s: any) => s.type === "TOTAL");
  const groupWithLFC = groups.find((g) =>
    (g.table || []).some((r: any) => /liverpool/i.test(r.team?.name || "")),
  );
  const sel = groupWithLFC || groups[0];
  const name = niceGroup(sel?.group || "Group");
  const rows: StandingRow[] = (sel?.table || []).map((r: any) => ({
    position: r.position,
    team: r.team?.name || "",
    crest: r.team?.crest || null,
    played: r.playedGames ?? r.played ?? 0,
    won: r.won ?? 0,
    draw: r.draw ?? 0,
    lost: r.lost ?? 0,
    gd: r.goalDifference ?? (r.goalsFor ?? 0) - (r.goalsAgainst ?? 0),
    pts: r.points ?? 0,
  }));
  return { name, rows };
}

function buildStandingsMarkdown(
  title: string,
  rows: StandingRow[] | null,
  opts?: {
    highlightBottom?: number;
    highlightTop?: number;
    bottomLabel?: string;
    topLabel?: string;
    midLabel?: string;
    bottomIcon?: string;
    topIcon?: string;
  },
): string {
  const parts: string[] = [];
  parts.push(`# ${title}`);
  if (!rows || rows.length === 0) {
    parts.push("No standings available.");
    return parts.join("\n\n");
  }
  // Right-align numbers; omit crest images (Raycast tables don’t render images well inside cells)
  parts.push(`| # | Team | P | W | D | L | GD | Pts |`);
  parts.push(`|:--:|:--|--:|--:|--:|--:|--:|--:|`);
  const highlightBottom = Math.max(0, opts?.highlightBottom ?? 0);
  const highlightTop = Math.max(0, opts?.highlightTop ?? 0);
  const bottomLabel = (opts?.bottomLabel || "Relegation zone").trim();
  const topLabel = (opts?.topLabel || "Top").trim();
  const midLabel = (opts?.midLabel || "Playoff").trim();
  const bottomIcon = (opts?.bottomIcon || "⬇️").trim();
  const topIcon = (opts?.topIcon || "⭐").trim();
  const highlightFrom =
    highlightBottom > 0 ? Math.max(1, rows.length - highlightBottom + 1) : Infinity;
  const playoffStart = highlightTop > 0 ? highlightTop + 1 : Infinity;

  // Optional top section divider
  if (highlightTop > 0) {
    parts.push(`|   | — ${topLabel} — |  |  |  |  |  |  |`);
  }

  for (const r of rows) {
    const isLFC = /liverpool/i.test(r.team);
    const isBottom = r.position >= highlightFrom;
    const isTop = highlightTop > 0 ? r.position <= highlightTop : false;
    const arrow = isBottom ? ` ${bottomIcon}` : "";
    const star = isTop ? ` ${topIcon}` : "";
    const crest = r.crest ? `![c](${r.crest}?raycast-height=16)` : "";
    const baseName = `${escapeTableCell(r.team)}${star}`;
    const name = isLFC ? `**${baseName}**` : baseName;
    const teamCell = crest ? `${crest} ${name}${arrow}` : `${name}${arrow}`;
    if (r.position === playoffStart && isFinite(playoffStart) && playoffStart < highlightFrom) {
      parts.push(`|   | — ${midLabel} — |  |  |  |  |  |  |`);
    }
    if (r.position === highlightFrom && isFinite(highlightFrom)) {
      parts.push(`|   | — ${bottomLabel} — |  |  |  |  |  |  |`);
    }
    parts.push(
      `| ${r.position} | ${teamCell} | ${r.played} | ${r.won} | ${r.draw} | ${r.lost} | ${r.gd} | ${r.pts} |`,
    );
  }
  if (highlightBottom > 0 || highlightTop > 0) {
    const notes: string[] = [];
    if (highlightTop > 0)
      notes.push(
        `${topIcon} indicates ${topLabel}${highlightTop ? ` (top ${highlightTop})` : ""}.`,
      );
    if (highlightBottom > 0)
      notes.push(
        `${bottomIcon} indicates ${bottomLabel}${highlightBottom ? ` (bottom ${highlightBottom})` : ""}.`,
      );
    parts.push("\nNote: " + notes.join(" "));
  }
  return parts.join("\n");
}

function niceGroup(code: string): string {
  const m = code?.match(/GROUP_([A-Z])/);
  return m ? `Group ${m[1]}` : (code || "").replace(/_/g, " ");
}
