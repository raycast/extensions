import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured } from "../utils/firebase";
import { getDocuments } from "../api/firestore";

export default function ListDocuments() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function checkConfiguration() {
      try {
        const configured = await isServiceAccountConfigured();
        setIsConfigured(configured);
      } catch (error) {
        console.error("Error checking service account configuration:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Check Failed",
          message: "Failed to check service account configuration.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkConfiguration();
  }, []);

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading..." />;
  }

  if (!isConfigured) {
    return (
      <Detail
        markdown="# Firebase Service Account Not Configured\n\nYou need to set up your Firebase service account before you can use this extension.\n\nClick the 'Set Up Service Account' button below to configure your Firebase service account."
        actions={
          <ActionPanel>
            <Action title="Set up Service Account" onAction={() => push(<SetupServiceAccountView />)} />
          </ActionPanel>
        }
      />
    );
  }

  return <CollectionForm />;
}

function CollectionForm() {
  const [collectionName, setCollectionName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const { push } = useNavigation();

  async function handleSubmit() {
    if (!collectionName.trim()) {
      setError("Collection name is required");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      push(<DocumentList collectionName={collectionName} />);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Error navigating to document list:", error);
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="List Documents" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="collectionName"
        title="Collection Name"
        placeholder="Enter Firestore collection name"
        value={collectionName}
        onChange={setCollectionName}
        error={error}
        autoFocus
      />
    </Form>
  );
}

interface DocumentListProps {
  collectionName: string;
}

function DocumentList({ collectionName }: DocumentListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const docs = await getDocuments(collectionName);
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setError("Failed to fetch documents. Please try again.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch Documents",
          message: `Error fetching documents from ${collectionName}`,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [collectionName]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search documents in ${collectionName}...`} filtering={true}>
      {error ? (
        <List.EmptyView title="Error Fetching Documents" description={error} icon="⚠️" />
      ) : documents.length === 0 ? (
        <List.EmptyView
          title="No Documents Found"
          description={`No documents found in the collection '${collectionName}'`}
          icon="📄"
        />
      ) : (
        documents.map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.id}
            subtitle={`${Object.keys(doc).length - 1} fields`}
            actions={
              <ActionPanel>
                <Action
                  title="View Document"
                  onAction={() => push(<DocumentDetail document={doc} collectionName={collectionName} />)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface DocumentDetailProps {
  document: any;
  collectionName: string;
}

function DocumentDetail({ document, collectionName }: DocumentDetailProps) {
  // Format document data for display
  const formattedData = Object.entries(document)
    .map(([key, value]) => {
      if (key === "id") {
        return `## ID: ${value}`;
      }

      let formattedValue = value;
      if (typeof value === "object") {
        formattedValue = "```json\n" + JSON.stringify(value, null, 2) + "\n```";
      }

      return `### ${key}\n${formattedValue}`;
    })
    .join("\n\n");

  return (
    <Detail
      markdown={`# Document in ${collectionName}\n\n${formattedData}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Document Id" content={document.id} />
          <Action.CopyToClipboard title="Copy Document as JSON" content={JSON.stringify(document, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

function SetupServiceAccountView() {
  const { pop } = useNavigation();

  // Import the setup component dynamically to avoid circular dependencies
  const SetupServiceAccount = require("./setup-service-account").default;

  return (
    <SetupServiceAccount
      onComplete={() => {
        pop();
        showToast({
          style: Toast.Style.Success,
          title: "Service Account Configured",
          message: "You can now use the Firebase Firestore Manager.",
        });
      }}
    />
  );
}
