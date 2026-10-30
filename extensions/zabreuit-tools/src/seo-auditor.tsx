import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Color, Icon } from '@raycast/api';
import { EngineBridge } from './services/engine-bridge.js';
import type { SeoAuditResult } from './types.js';

export async function runSeoAuditor(url: string, htmlOverride?: string): Promise<SeoAuditResult> {
  const bridge = new EngineBridge();
  return bridge.auditSeo(url, htmlOverride);
}

export default function Command(): JSX.Element {
  const [url] = useState<string>('https://example.com');
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    runSeoAuditor(url)
      .then((data) => {
        if (isMounted) {
          setResult(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Audit website SEO & metadata...">
      {result && (
        <>
          <List.Section title="General Compliance Score">
            <List.Item
              icon={
                result.complianceScore >= 80
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.ExclamationMark, tintColor: Color.Yellow }
              }
              title={`Compliance Score: ${result.complianceScore}/100`}
              subtitle={result.openGraphValid ? 'OpenGraph Valid' : 'Missing Critical OpenGraph Tags'}
              accessories={[{ text: `${result.complianceScore}%` }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={result.url} />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Metadata Inspection">
            <List.Item
              title="Page Title"
              subtitle={result.title || 'No Title Found'}
              accessories={[{ text: result.title ? 'Found' : 'Missing' }]}
            />
            <List.Item
              title="Meta Description"
              subtitle={result.description || 'No Description'}
              accessories={[{ text: result.description ? 'Found' : 'Missing' }]}
            />
          </List.Section>

          {result.issues.length > 0 && (
            <List.Section title="Issues & Improvements">
              {result.issues.map((issue, idx) => (
                <List.Item
                  key={idx}
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  title={issue}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
