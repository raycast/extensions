import { useState, useEffect } from 'react';
import { Detail, ActionPanel, Action, showToast, Toast } from '@raycast/api';
import { EngineBridge } from './services/engine-bridge.js';
import type { ScrapeResult } from './types.js';

export async function runQuickScraper(url: string, htmlOverride?: string): Promise<ScrapeResult> {
  const bridge = new EngineBridge();
  return bridge.scrapeUrl(url, htmlOverride);
}

export default function Command(): JSX.Element {
  const [url, setUrl] = useState<string>('https://news.ycombinator.com');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    runQuickScraper(url)
      .then((data) => {
        if (isMounted) {
          setResult(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: 'Scrape Failed',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const markdownContent = result
    ? `# ${result.title}\n\n**Source:** [${result.url}](${result.url})\n\n---\n\n${result.markdown}`
    : '# Zabreuit Quick Scraper\n\nFetching page content...';

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
                  title="Copy Extracted JSON-LD"
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
