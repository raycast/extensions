import { Detail, ActionPanel, Action } from "@raycast/api";

interface JsonViewerProps {
  data: any;
  title: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);

  const markdown = `# ${title}

\`\`\`json
${jsonString}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy JSON"
            content={jsonString}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
} 