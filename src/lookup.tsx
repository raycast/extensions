import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";

// Lightweight, typesafe local aliases: cast exported Raycast components to
// React.ComponentType<any> shapes so TypeScript accepts them as JSX element
// constructors without resorting to untyped `any`.
type RCComp = React.ComponentType<any>;
const ListAny = List as unknown as RCComp & { Item: RCComp; Section: RCComp; EmptyView: RCComp };
const ListEmptyView = ListAny.EmptyView;
const ListSection = ListAny.Section;
const ListItemComp = ListAny.Item;
const ActionPanelAny = ActionPanel as unknown as RCComp;
const ActionAny = Action as unknown as RCComp & { Paste?: RCComp; CopyToClipboard?: RCComp; OpenInBrowser?: RCComp };

// Use Raycast UI components directly; a local JSX augmentation is provided
// in `types/global-jsx.d.ts` so these components are accepted by the TSX
// parser without per-file `as any` casts.

export default function LookupCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter an app identifier or URL",
      });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open URL",
        message: errorMessage,
      });
    }
  }

  const queryTrimmed = query.trim();
  const isMsStoreUrl = queryTrimmed && isValidMicrosoftStoreUrl(queryTrimmed);

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

      const response = await fetch("https://store.rg-adguard.net/api/GetFiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const html = await response.text();
      const parsed = parseLookupResults(html);
      setResults(parsed);

      await showToast({
        style: parsed.length > 0 ? Toast.Style.Success : Toast.Style.Failure,
        title: parsed.length > 0 ? `Found ${parsed.length} download link${parsed.length === 1 ? "" : "s"}` : "No download links found",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate links",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsGeneratingLinks(false);
    }
  }

  return (
    <ListAny
      searchBarPlaceholder="Search for a Microsoft Store app..."
      onSearchTextChange={setQuery}
      throttle
      isLoading={isGeneratingLinks}
    >
      {!queryTrimmed && results.length === 0 ? (
        <ListEmptyView
          icon="🔍"
          title="Search for a Microsoft Store App"
          description="Enter an app name, Product ID, or Microsoft Store URL to get started"
        />
      ) : null}

      {queryTrimmed ? (
        <ListSection title="Lookup">
          <ListItemComp
            title={queryTrimmed}
            subtitle={isMsStoreUrl ? "✓ Valid Microsoft Store URL" : "Press Enter to open lookup"}
            accessories={isMsStoreUrl ? [{ text: "MS Store URL" }] : []}
            actions={
              <ActionPanelAny>
                <ActionAny title="Open Lookup" onAction={handleOpen} />
                <ActionAny title="Generate Download Links" onAction={handleGenerateLinks} icon={Icon.Link} />
                <ActionAny title="Paste Lookup URL" onAction={async () => { await Clipboard.copy(buildLookupUrl(queryTrimmed)); }} />
                <ActionAny title="Copy Lookup URL" onAction={async () => { await Clipboard.copy(buildLookupUrl(queryTrimmed)); }} />
              </ActionPanelAny>
            }
          />
        </ListSection>
      ) : null}

      {results.length > 0 ? (
        <ListSection title="Download Links" subtitle={`${results.length}`}>
          {results.map((result) => (
            <ListItemComp
              key={result.url}
              title={result.name}
              subtitle={result.size}
              accessories={[
                result.expire ? { icon: Icon.Clock, text: result.expire } : undefined,
                result.sha1 ? { icon: Icon.Fingerprint, text: `${result.sha1.slice(0, 8)}…` } : undefined,
              ].filter(Boolean)}
              actions={
                <ActionPanelAny>
                  <ActionAny title="Open in Browser" onAction={async () => { await open(result.url); }} />
                  <ActionAny title="Copy Download URL" onAction={async () => { await Clipboard.copy(result.url); }} />
                  <ActionAny title="Copy Download URL" onAction={async () => { await Clipboard.copy(result.url); }} />
                  {result.sha1 ? (
                    <ActionAny title="Copy SHA-1" onAction={async () => { await Clipboard.copy(result.sha1); }} />
                  ) : null}
                </ActionPanelAny>
              }
            />
          ))}
        </ListSection>
      ) : null}
    </ListAny>
  );
}

type LookupResult = {
  name: string;
  url: string;
  expire: string;
  sha1: string;
  size: string;
};

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

function parseLookupResults(html: string): LookupResult[] {
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g));
  if (rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .map((row) => {
      const cells = Array.from(row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g));
      if (cells.length < 4) {
        return null;
      }

      const linkMatch = cells[0][1].match(/href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) {
        return null;
      }

      return {
        url: decodeHtml(linkMatch[1]),
        name: decodeHtml(stripHtml(linkMatch[2])),
        expire: decodeHtml(stripHtml(cells[1][1])),
        sha1: decodeHtml(stripHtml(cells[2][1])),
        size: decodeHtml(stripHtml(cells[3][1])),
      } satisfies LookupResult;
    })
    .filter(Boolean) as LookupResult[];
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
