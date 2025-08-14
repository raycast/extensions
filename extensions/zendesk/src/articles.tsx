import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { zdFetch } from "./zendesk";

interface Article {
  id: number;
  title: string;
  html_url: string;
  updated_at: string;
}
interface ArticleSearch {
  results: Article[];
}

export default function Articles() {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);

  async function search(q: string) {
    if (!q) return;
    setLoading(true);
    try {
      const res = await zdFetch<ArticleSearch>(
        `/api/v2/help_center/articles/search.json?query=${encodeURIComponent(q)}`,
      );
      setArticles(res.results);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to search articles", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("getting started");
  }, []);

  return (
    <List isLoading={loading} onSearchTextChange={search} throttle searchBarPlaceholder="Search Help Center…">
      {articles.map((a: Article) => (
        <List.Item
          key={a.id}
          title={a.title}
          accessories={[{ date: new Date(a.updated_at) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={a.html_url} />
              <Action.CopyToClipboard title="Copy Article URL" content={a.html_url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
