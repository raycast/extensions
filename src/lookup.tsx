// Keep type checking disabled for now due to type conflicts between Raycast API types and
// the workspace React/TypeScript setup. Follow-up: align @types/react / TypeScript versions
// and remove this directive to enable full type checking.
// @ts-nocheck
// @ts-nocheck
import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { load } from "cheerio";

type RGLookupResult = {
  name: string;
  url: string;
  expire: string;
  sha1: string;
  size: string;
};

export default function LookupCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RGLookupResult[]>([]);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);

  function buildLookupUrl(input: string): string {
    const trimmed = input.trim();
    if (trimmed.length > 2048) {
      throw new Error("Input too long (max 2048 characters)");
    }
    const encoded = encodeURIComponent(trimmed);
    return `https://store.rg-adguard.net/#${encoded}`;
  }

  function isValidMicrosoftStoreUrl(input: string): boolean {
    const storeUrlPattern = /^https?:\/\/(www\.)?microsoft\.com\/.*\/p\//i;
    const storeUrlPattern2 = /^https?:\/\/(apps|www)\.microsoft\.com/i;
    return storeUrlPattern.test(input) || storeUrlPattern2.test(input);
  }

  async function handleOpen() {
    if (!query.trim()) {
      await showFailureToast({ title: "Enter an app identifier or URL" });
      return;
    }

    try {
      const url = buildLookupUrl(query);
      await Clipboard.copy(url);
      await open(url);
      await showToast({
        style: Toast.Style.Success,
        title: "Opened lookup URL",
        message: "URL copied to clipboard",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await showFailureToast({ title: "Failed to open URL", message: errorMessage });
    }
  }

  const queryTrimmed = useMemo(() => query.trim(), [query]);
  const isMsStoreUrl = useMemo(() => (queryTrimmed ? isValidMicrosoftStoreUrl(queryTrimmed) : false), [queryTrimmed]);

  useEffect(() => {
    setResults([]);
  }, [queryTrimmed]);

  async function handleGenerateLinks() {
    if (!queryTrimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter something to generate",
      });
      return;
    }

    setIsGeneratingLinks(true);
    try {
      const params = new URLSearchParams({
        type: determineLookupType(queryTrimmed),
        url: queryTrimmed,
        ring: "Retail",
        lang: "en-US",
      });

      // Abort fetch if it takes too long to avoid hanging the UI
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch("https://store.rg-adguard.net/api/GetFiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Identify as Raycast extension without sending sensitive info
          "User-Agent": "Raycast-Extension rg-adguard-links/1.0",
        },
        body: params.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const html = await response.text();
  const parsed = parseLookupResults(html);
  setResults(parsed as RGLookupResult[]);

      await showToast({
        style: parsed.length > 0 ? Toast.Style.Success : Toast.Style.Failure,
        title: parsed.length > 0 ? `Found ${parsed.length} download link${parsed.length === 1 ? "" : "s"}` : "No download links found",
      });
    } catch (error) {
      await showFailureToast({ title: "Failed to generate links", message: error instanceof Error ? error.message : "Unknown error occurred" });
    } finally {
      setIsGeneratingLinks(false);
    }
  }

  return (
    <List
      searchBarPlaceholder="Search for a Microsoft Store app..."
      onSearchTextChange={setQuery}
      throttle
      isLoading={isGeneratingLinks}
    >
      {!queryTrimmed && results.length === 0 ? (
        <List.EmptyView
          icon="🔍"
          title="Search for a Microsoft Store App"
          description="Enter an app name, Product ID, or Microsoft Store URL to get started"
        />
      ) : null}

      {queryTrimmed ? (
        <List.Section title="Lookup">
          <List.Item
            title={queryTrimmed}
            subtitle={isMsStoreUrl ? "✓ Valid Microsoft Store URL" : "Press Enter to open lookup"}
            accessories={isMsStoreUrl ? [{ text: "MS Store URL" }] : undefined}
            actions={
              <ActionPanel>
                <Action title="Open Lookup" onAction={handleOpen} />
                <Action title="Generate Download Links" onAction={handleGenerateLinks} icon={Icon.Link} />
                <Action.Paste title="Paste Lookup URL" content={buildLookupUrl(queryTrimmed)} />
                <Action.CopyToClipboard title="Copy Lookup URL" content={buildLookupUrl(queryTrimmed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {results.length > 0 ? (
        <List.Section title="Download Links" subtitle={`${results.length}`}>
          {results.map((result) => {
            const accessories: List.Item.Accessory[] = [];
            if (result.expire) accessories.push({ icon: Icon.Clock, text: result.expire });
            if (result.sha1) accessories.push({ icon: Icon.Fingerprint, text: `${result.sha1.slice(0, 8)}…` });
            
            return (
              <List.Item
                key={result.url}
                title={result.name}
                subtitle={result.size}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={result.url} />
                    <Action.CopyToClipboard title="Copy Download URL" content={result.url} />
                    <Action.Paste title="Paste Download URL" content={result.url} />
                    {result.sha1 && <Action.CopyToClipboard title="Copy SHA-1" content={result.sha1} />}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

function determineLookupType(value: string): "url" | "ProductId" | "PackageFamilyName" | "CategoryId" {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return "CategoryId";
  }
  if (/^[A-Z0-9]{12}$/i.test(value)) {
    return "ProductId";
  }
  if (/^[A-Za-z0-9.]+_[A-Za-z0-9]+_[a-z0-9]{13}$/i.test(value)) {
    return "PackageFamilyName";
  }
  if (/^https?:\/\//i.test(value)) {
    return "url";
  }
  return "url";
}

function parseLookupResults(html: string): RGLookupResult[] {
  const $ = load(html);
  const rows = $("table tr");
  if (rows.length <= 1) return [];

  const items: RGLookupResult[] = [];
  // Skip header row (index 0)
  rows.slice(1).each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 4) return;

    const link = $(tds[0]).find("a");
    const url = (link.attr("href") || "").trim();
    const name = link.text().trim();
    const expire = $(tds[1]).text().trim();
    const sha1 = $(tds[2]).text().trim();
    const size = $(tds[3]).text().trim();

    if (!url || !name) return;
    items.push({ url, name, expire, sha1, size });
  });

  return items;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
