import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Color, Icon, showToast, Toast, LaunchProps } from "@raycast/api";
import { EngineBridge } from "./services/engine-bridge.js";
import type { SeoAuditResult } from "./types.js";

export async function runSeoAuditor(url: string, htmlOverride?: string): Promise<SeoAuditResult> {
  const bridge = new EngineBridge();
  return bridge.auditSeo(url, htmlOverride);
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SeoAuditor }>): JSX.Element {
  const url = props.arguments.url;
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    runSeoAuditor(url)
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
          showToast({ style: Toast.Style.Failure, title: "Audit failed", message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter findings...">
      {error && (
        <List.Section title="Error">
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Could not audit this page"
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
          <List.Section title="Health score">
            <List.Item
              icon={
                result.complianceScore >= 80
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.ExclamationMark, tintColor: Color.Yellow }
              }
              title={`${result.complianceScore}/100`}
              subtitle={result.openGraphValid ? "OpenGraph complete" : "OpenGraph incomplete"}
              accessories={[{ text: result.url }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={result.url} />
                  <Action.CopyToClipboard
                    title="Copy Findings"
                    content={result.issues.join("\n") || "No issues found"}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Metadata">
            <List.Item title="Title" subtitle={result.title || "Missing"} />
            <List.Item title="Description" subtitle={result.description || "Missing"} />
          </List.Section>

          {result.missingTags.length > 0 && (
            <List.Section title={`Missing OpenGraph tags (${result.missingTags.length})`}>
              {result.missingTags.map((tag) => (
                <List.Item key={tag} icon={Icon.ExclamationMark} title={tag} />
              ))}
            </List.Section>
          )}

          {result.issues.length > 0 && (
            <List.Section title={`Findings (${result.issues.length})`}>
              {result.issues.map((issue, index) => (
                <List.Item key={`${index}-${issue}`} icon={Icon.Dot} title={issue} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
