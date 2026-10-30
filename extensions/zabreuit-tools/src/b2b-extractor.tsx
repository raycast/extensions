import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@raycast/api";
import { EngineBridge } from "./services/engine-bridge.js";
import type { B2bContactResult } from "./types.js";

export async function runB2bExtractor(url: string, htmlOverride?: string): Promise<B2bContactResult> {
  const bridge = new EngineBridge();
  return bridge.extractB2b(url, htmlOverride);
}

export default function Command(props: { arguments: { url: string } }): JSX.Element {
  const url = props.arguments.url;
  const [result, setResult] = useState<B2bContactResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    runB2bExtractor(url)
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
          showToast({ style: Toast.Style.Failure, title: "Extraction failed", message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const socialEntries = result ? Object.entries(result.socialLinks).filter(([, value]) => value) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter contacts...">
      {error && (
        <List.Section title="Error">
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Could not read this page"
            subtitle={error}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
                <Action.CopyToClipboard title="Copy Error" content={error} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {result && (
        <>
          <List.Section title="Company">
            <List.Item
              icon={Icon.Building}
              title={result.companyName || "Unknown company"}
              subtitle={result.domain || result.url}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={result.url} />
                  <Action.CopyToClipboard title="Copy Domain" content={result.domain} />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Emails (${result.emails.length})`}>
            {result.emails.length === 0 ? (
              <List.Item icon={Icon.Minus} title="No public email found" />
            ) : (
              result.emails.map((email) => (
                <List.Item
                  key={email}
                  icon={Icon.Envelope}
                  title={email}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Email" content={email} />
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>

          <List.Section title={`Phones (${result.phones.length})`}>
            {result.phones.length === 0 ? (
              <List.Item icon={Icon.Minus} title="No public phone found" />
            ) : (
              result.phones.map((phone) => (
                <List.Item
                  key={phone}
                  icon={Icon.Phone}
                  title={phone}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Phone" content={phone} />
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>

          {socialEntries.length > 0 && (
            <List.Section title={`Social profiles (${socialEntries.length})`}>
              {socialEntries.map(([network, link]) => (
                <List.Item
                  key={network}
                  icon={Icon.Link}
                  title={network}
                  subtitle={link}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Profile" url={link} />
                      <Action.CopyToClipboard title="Copy Link" content={link} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title={`Technologies (${result.technologies.length})`}>
            {result.technologies.length === 0 ? (
              <List.Item icon={Icon.Minus} title="No technologies detected" />
            ) : (
              result.technologies.map((tech) => (
                <List.Item
                  key={tech}
                  icon={Icon.ComputerChip}
                  title={tech}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Technology" content={tech} />
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
