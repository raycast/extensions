import { Detail, ActionPanel, Action, Clipboard } from "@raycast/api";
import * as admin from "firebase-admin";
import { getServiceAccount } from "../utils/firebase";
import { useEffect, useState } from "react";

interface JsonViewerProps {
  data: any;
  title: string;
}

export function JsonViewer({ data, title }: JsonViewerProps) {
  const [projectId, setProjectId] = useState<string>("");
  
  useEffect(() => {
    // Load project ID from service account
    async function loadProjectId() {
      try {
        const serviceAccount = await getServiceAccount();
        if (serviceAccount && serviceAccount.project_id) {
          setProjectId(serviceAccount.project_id);
        }
      } catch (error) {
        console.error("Error loading project ID:", error);
      }
    }

    loadProjectId();
  }, []);
  
  // Process the data to convert Firestore timestamps to readable dates
  const processedData = processFirestoreData(data);
  const jsonString = JSON.stringify(processedData, null, 2);
  
  // Extract collection name from title (assuming format "Document in collection_name")
  const collectionMatch = title.match(/Document in (.+)/);
  const collectionName = collectionMatch ? collectionMatch[1] : "";
  
  // Function to generate Firestore URL for a document
  const getFirestoreUrl = (): string => {
    if (!projectId || !collectionName || !data.id) return "";
    
    // Encode collection name and document ID for URL
    const encodedCollection = collectionName.replace(/\//g, '~2F');
    const encodedDocId = data.id.replace(/\//g, '~2F');
    
    return `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2F${encodedCollection}~2F${encodedDocId}`;
  };

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
          {data.id && (
            <Action.CopyToClipboard
              title="Copy Document ID"
              content={data.id}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          )}
          {data.id && projectId && collectionName && (
            <Action.CopyToClipboard
              title="Copy Firestore URL"
              content={getFirestoreUrl()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
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