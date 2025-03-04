import { Detail, ActionPanel, Action } from "@raycast/api";
import * as admin from "firebase-admin";

interface JsonViewerProps {
  data: any;
  title: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  // Process the data to convert Firestore timestamps to readable dates
  const processedData = processFirestoreData(data);
  const jsonString = JSON.stringify(processedData, null, 2);

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

/**
 * Recursively processes Firestore data to convert timestamps to readable format
 */
function processFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => processFirestoreData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    // Check if it's a Firestore Timestamp
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
      // Convert to JavaScript Date
      const date = new Date(data._seconds * 1000 + data._nanoseconds / 1000000);
      return date.toLocaleString();
    }

    // Check if it's a Firestore Timestamp from admin SDK
    if (data instanceof admin.firestore.Timestamp) {
      return data.toDate().toLocaleString();
    }

    // Process regular objects recursively
    const result: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = processFirestoreData(data[key]);
      }
    }
    return result;
  }

  // Return primitive values as is
  return data;
} 