import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Icon } from '@raycast/api';
import { EngineBridge } from './services/engine-bridge.js';
import type { B2bContactResult } from './types.js';

export async function runB2bExtractor(
  url: string,
  htmlOverride?: string,
  resolveDns = false,
): Promise<B2bContactResult> {
  const bridge = new EngineBridge();
  return bridge.extractB2b(url, htmlOverride, resolveDns);
}

export default function Command(): JSX.Element {
  const [url] = useState<string>('https://example.com');
  const [result, setResult] = useState<B2bContactResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    runB2bExtractor(url)
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
    <List isLoading={isLoading} searchBarPlaceholder="Search extracted contacts & tech...">
      {result && (
        <>
          <List.Section title={`Identified Emails (${result.emails.length})`}>
            {result.emails.map((email, idx) => (
              <List.Item
                key={idx}
                icon={Icon.Envelope}
                title={email}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Email" content={email} />
                    <Action.OpenInBrowser url={`mailto:${email}`} title="Send Email" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {result.phones.length > 0 && (
            <List.Section title={`Phone Numbers (${result.phones.length})`}>
              {result.phones.map((phone, idx) => (
                <List.Item
                  key={idx}
                  icon={Icon.Phone}
                  title={phone}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Phone" content={phone} />
                      <Action.OpenInBrowser url={`tel:${phone}`} title="Call Phone" />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {result.technologies.length > 0 && (
            <List.Section title={`Detected Technologies (${result.technologies.length})`}>
              {result.technologies.map((tech, idx) => (
                <List.Item key={idx} icon={Icon.Code} title={tech} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
