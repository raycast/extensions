import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, LaunchProps } from "@raycast/api";
import { EngineBridge } from "./services/engine-bridge.js";
import type { ScrapeResult } from "./types.js";

export async function runQuickScraper(url: string, htmlOverride?: string): Promise<ScrapeResult> {
  const bridge = new EngineBridge();
  return bridge.scrapeUrl(url, htmlOverride);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.QuickScraper }>): JSX.Element {
  const url = props.arguments.url;
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    runQuickScraper(url)
      .then((data) => {
        if (isMounted) {
          setResult(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: "Scrape failed", message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (error) {
    return (
      <Detail
        markdown={`# Could not read this page\n\n${error}\n\n**URL:** ${url}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={url} />
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  const markdownContent = result
    ? `# ${result.title}\n\n**Source:** [${result.url}](${result.url})\n\n---\n\n${result.markdown}`
    : `# Reading ${url}\n\nFetching page content...`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent}
      actions={
        <ActionPanel>
          {result && (
            <>
              <Action.CopyToClipboard title="Copy Clean Markdown" content={result.markdown} />
              <Action.CopyToClipboard title="Copy Clean Text" content={result.cleanText} />
              {result.jsonLd && (
                <Action.CopyToClipboard
                  title="Copy Structured Data (JSON-LD)"
                  content={JSON.stringify(result.jsonLd, null, 2)}
                />
              )}
              <Action.OpenInBrowser url={result.url} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
