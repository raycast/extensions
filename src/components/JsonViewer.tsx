import { Action, ActionPanel, Detail } from "@raycast/api";
import { useState } from "react";
import { FirestoreDocument } from "../types/firestore";

interface JsonViewerProps {
  data: FirestoreDocument;
  title?: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderJson = (obj: FirestoreDocument, level = 0): string => {
    const indent = "  ".repeat(level);
    const nextIndent = "  ".repeat(level + 1);

    let output = "{\n";
    const entries = Object.entries(obj);

    entries.forEach(([key, value], index) => {
      output += `${nextIndent}"${key}": ${formatValue(value)}`;
      if (index < entries.length - 1) {
        output += ",";
      }
      output += "\n";
    });

    output += `${indent}}`;
    return output;
  };

  const markdown = `# ${title || "JSON Viewer"}

\`\`\`json
${renderJson(data)}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={expanded ? "Collapse All" : "Expand All"} onAction={() => setExpanded(!expanded)} />
        </ActionPanel>
      }
    />
  );
}
