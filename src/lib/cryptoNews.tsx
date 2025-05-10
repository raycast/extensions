import { Action, ActionPanel, List, showToast, Toast, Icon, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import moment from "moment";

// Define our preferences structure
interface Preferences {
  selectedSources: string;
  numberOfHeadlines: string;
}

// Define our item structure based on RSS feed
interface NewsItem extends Parser.Item {
  source: string;
  sourceKey: string;
  read?: boolean;
}

// Define our cache structure
interface CacheData {
  items: NewsItem[];
  timestamp: number;
  sources: string[];
}

// Define our state
interface State {
  items?: NewsItem[];
  isLoading: boolean;
  error?: Error;
}

// Create a new RSS parser
const parser = new Parser();

// News sources
export const NEWS_SOURCES = {
  COINDESK: {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    logo: "CoinDesk-logo.png",
  },
  COINTELEGRAPH: {
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    logo: "Cointelegraph-logo.png",
  },
  CRYPTONEWS: {
    name: "Bitcoin.com News",
    url: "https://news.bitcoin.com/feed/",
    logo: "cryptonews-logo.png",
  },
  BITCOINMAGAZINE: {
    name: "Bitcoin Magazine",
    url: "https://bitcoinmagazine.com/.rss/full/",
    logo: "BitcoinMagazine-logo.png",
  },
};

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

interface CryptoNewsProps {
  defaultSource?: string;
}

export default function CryptoNews({ defaultSource }: CryptoNewsProps) {
  // Get user preferences
  const preferences = getPreferenceValues<Preferences>();
  const selectedSourcesStr = preferences.selectedSources || "COINDESK,COINTELEGRAPH,CRYPTONEWS,BITCOINMAGAZINE";
  const selectedSources = selectedSourcesStr.split(",");
  const numberOfHeadlines = parseInt(preferences.numberOfHeadlines || "20", 10);

  // Set up state
  const [state, setState] = useState<State>({ isLoading: true });
  // Keep defaultSource or null for type consistency
  const [selectedSource] = useState<string | undefined>(defaultSource);

  // Fetch news when component mounts
  useEffect(() => {
    fetchNews();
  }, []);

  // Function to fetch news from multiple RSS feeds
  async function fetchNews(forceRefresh = false) {
    setState((prevState) => ({ ...prevState, isLoading: true }));

    try {
      // Check cache if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await getCachedData();

        if (
          cachedData &&
          cachedData.sources &&
          arraysEqual(cachedData.sources, selectedSources) &&
          Date.now() - cachedData.timestamp < CACHE_DURATION
        ) {
          // If we have a default source, filter the cached items
          let filteredItems = cachedData.items || [];

          if (defaultSource) {
            filteredItems = filteredItems.filter((item) => item.sourceKey === defaultSource);
          }

          setState({
            items: filteredItems.slice(0, numberOfHeadlines),
            isLoading: false,
          });
          return;
        }
      }

      // Get previously read articles
      const readArticles = await getReadArticles();

      // Fetch from all selected sources or just the default source if specified
      const sourcesToFetch = defaultSource ? [defaultSource] : selectedSources;

      if (!sourcesToFetch || sourcesToFetch.length === 0) {
        setState({
          error: new Error("No news sources selected. Please update your preferences."),
          isLoading: false,
        });
        return;
      }

      const fetchPromises = sourcesToFetch.map(async (sourceKey) => {
        const source = NEWS_SOURCES[sourceKey as keyof typeof NEWS_SOURCES];
        if (!source) {
          return [];
        }

        try {
          const feed = await parser.parseURL(source.url);
          return (feed.items || []).map((item) => ({
            ...item,
            source: source.name,
            sourceKey: sourceKey,
            read: readArticles.includes(item.guid || item.link || ""),
          }));
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to load ${source.name}`,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          return [];
        }
      });

      // Wait for all feeds to be fetched
      const results = await Promise.all(fetchPromises);

      // Combine and sort all items by date
      let allItems: NewsItem[] = [];
      results.forEach((items) => {
        if (items && Array.isArray(items)) {
          allItems = [...allItems, ...items];
        }
      });

      if (allItems.length === 0) {
        setState({
          items: [],
          isLoading: false,
        });
        return;
      }

      // Sort by date (newest first)
      allItems.sort((a, b) => {
        const dateA = new Date(a.isoDate || a.pubDate || 0);
        const dateB = new Date(b.isoDate || b.pubDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Limit the number of items
      const limitedItems = allItems.slice(0, numberOfHeadlines);

      // Save to cache (always save all items regardless of default source)
      if (!defaultSource) {
        await saveCacheData({
          items: allItems,
          timestamp: Date.now(),
          sources: selectedSources,
        });
      }

      setState({ items: limitedItems, isLoading: false });
    } catch (error) {
      setState({
        error: error instanceof Error ? error : new Error("Something went wrong"),
        isLoading: false,
      });

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load news",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Helper function to compare arrays
  function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  // Show error toast if there's an error
  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load news",
        message: state.error.message,
      });
    }
  }, [state.error]);

  // Format the publication date
  function formatDate(dateString?: string): string {
    if (!dateString) return "Unknown date";
    const date = moment(dateString);
    return date.fromNow();
  }

  // Cache functions
  async function getCachedData(): Promise<CacheData | null> {
    const data = await LocalStorage.getItem<string>("cryptoNewsCache");
    if (!data) return null;

    try {
      return JSON.parse(data) as CacheData;
    } catch {
      return null;
    }
  }

  async function saveCacheData(data: CacheData): Promise<void> {
    await LocalStorage.setItem("cryptoNewsCache", JSON.stringify(data));
  }

  // Mark article as read
  async function markAsRead(item: NewsItem) {
    if (!item.guid && !item.link) return;

    const identifier = item.guid || item.link || "";
    const readArticles = await getReadArticles();

    if (!readArticles.includes(identifier)) {
      await saveReadArticles([...readArticles, identifier]);

      // Update state to reflect the change
      setState((prevState) => {
        if (!prevState.items) return prevState;

        return {
          ...prevState,
          items: prevState.items.map((i) => {
            if (i === item) {
              return { ...i, read: true };
            }
            return i;
          }),
        };
      });
    }
  }

  // Get and save read articles
  async function getReadArticles(): Promise<string[]> {
    const data = await LocalStorage.getItem<string>("readArticles");
    if (!data) return [];

    try {
      return JSON.parse(data) as string[];
    } catch {
      return [];
    }
  }

  async function saveReadArticles(articles: string[]): Promise<void> {
    await LocalStorage.setItem("readArticles", JSON.stringify(articles));
  }

  // Handle opening article
  function handleOpenArticle(item: NewsItem) {
    if (item.link) {
      markAsRead(item);
    }
  }

  // Filter items by selected source
  const filteredItems =
    selectedSource && !defaultSource && state.items
      ? state.items.filter((item) => item.sourceKey === selectedSource)
      : state.items;

  // Get the title based on selected source
  const title = defaultSource
    ? NEWS_SOURCES[defaultSource as keyof typeof NEWS_SOURCES]?.name || "News"
    : "Crypto News";

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder={`Search ${title} articles...`}>
      {filteredItems?.map((item, index) => (
        <List.Item
          key={index}
          icon={getSourceIconPath(item.sourceKey)}
          title={item.title || "No title"}
          subtitle={item.source}
          accessories={[
            { text: formatDate(item.isoDate || item.pubDate), tooltip: "Published" },
            item.read ? { icon: Icon.Check, tooltip: "Read" } : { icon: Icon.Circle, tooltip: "Unread" },
          ]}
          actions={
            <ActionPanel>
              {item.link && (
                <Action.OpenInBrowser title="Open Article" url={item.link} onOpen={() => handleOpenArticle(item)} />
              )}
              <Action
                title={item.read ? "Mark as Unread" : "Mark as Read"}
                icon={item.read ? Icon.Circle : Icon.Check}
                onAction={() => markAsRead(item)}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={() => fetchNews(true)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Function to get the source icon path
function getSourceIconPath(sourceKey: string): string {
  switch (sourceKey) {
    case "COINDESK":
      return "coindesk.png";
    case "COINTELEGRAPH":
      return "cointelegraph.png";
    case "CRYPTONEWS":
      return "bitcoin-com.png";
    case "BITCOINMAGAZINE":
      return "bitcoinmagazine.png";
    default:
      return "icon.png";
  }
}
