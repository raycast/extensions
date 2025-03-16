import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured } from "./utils/firebase";
import { getCollections, getDocuments } from "./api/firestore";
import { JsonViewer } from "./components/JsonViewer";
import { showFailureToast } from "@raycast/utils";
import { FirestoreDocument } from "./types/firestore";

export default function Command() {
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
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    async function fetchCollections() {
      try {
        const fetchedCollections = await getCollections();
        if (isMounted) {
          setCollections(fetchedCollections);
          if (fetchedCollections.length > 0) {
            setCollectionName(fetchedCollections[0]);
          }
          setError(undefined);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        if (isMounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            // Wait a bit longer between retries
            setTimeout(fetchCollections, 1000 * retryCount);
            return;
          }

          setError("Failed to fetch collections. Please try again.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Fetch Collections",
            message: "Error fetching Firestore collections",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCollections();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit() {
    if (!collectionName) {
      setError("Collection name is required");
      return;
    }

    try {
      push(<DocumentList collectionName={collectionName} />);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Error navigating to document list:", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="List Documents" onSubmit={handleSubmit} />
          {error && (
            <Action
              title="Retry Fetching Collections"
              onAction={() => {
                setIsLoading(true);
                setError(undefined);
                getCollections()
                  .then((fetchedCollections) => {
                    setCollections(fetchedCollections);
                    if (fetchedCollections.length > 0) {
                      setCollectionName(fetchedCollections[0]);
                    }
                  })
                  .catch((error) => {
                    console.error("Error fetching collections:", error);
                    setError("Failed to fetch collections. Please try again.");
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to Fetch Collections",
                      message: "Error fetching Firestore collections",
                    });
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
            />
          )}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {collections.length > 0 ? (
        <Form.Dropdown
          id="collectionName"
          title="Collection Name"
          value={collectionName}
          onChange={setCollectionName}
          error={error}
        >
          {collections.map((collection) => (
            <Form.Dropdown.Item key={collection} value={collection} title={collection} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="No Collections Found"
          text={error || "No collections found in your Firestore database. Please create a collection first."}
        />
      )}
    </Form>
  );
}

interface DocumentListProps {
  collectionName: string;
}

function DocumentList({ collectionName }: DocumentListProps) {
  const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    async function fetchDocuments() {
      try {
        const docs = await getDocuments(collectionName);
        if (isMounted) {
          setDocuments(docs);
          setError(undefined);
        }
      } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        if (isMounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchDocuments, 1000 * retryCount);
            return;
          }

          setError("Failed to fetch documents. Please try again.");
          await showFailureToast({
            title: "Failed to Fetch Documents",
            message: `Error fetching documents from ${collectionName}`
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [collectionName]);

  if (error) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search documents in ${collectionName}...`}
        filtering={true}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={() => {
                setIsLoading(true);
                setError(undefined);
                getDocuments(collectionName)
                  .then((docs) => {
                    setDocuments(docs);
                  })
                  .catch((error) => {
                    console.error("Error fetching documents:", error);
                    setError("Failed to fetch documents. Please try again.");
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to Fetch Documents",
                      message: `Error fetching documents from ${collectionName}`,
                    });
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView title="Error Fetching Documents" description={error} icon="⚠️" />
      </List>
    );
  }

  if (documents.length === 0) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder={`Search documents in ${collectionName}...`} filtering={true}>
        <List.EmptyView
          title="No Documents Found"
          description={`No documents found in the collection '${collectionName}'`}
          icon="📄"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search documents in ${collectionName}...`} filtering={true}>
      {documents.map((doc) => (
        <List.Item
          key={`${doc.id}-${collectionName}`}
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
      ))}
    </List>
  );
}

interface DocumentDetailProps {
  document: FirestoreDocument;
  collectionName: string;
}

function DocumentDetail({ document, collectionName }: DocumentDetailProps) {
  return <JsonViewer data={document} title={`Document in ${collectionName}`} />;
}

function SetupServiceAccountView() {
  const { pop } = useNavigation();

  try {
    // Import the setup component dynamically to avoid circular dependencies
    const SetupServiceAccount = require("./setup-service-account").default;
    return <SetupServiceAccount onComplete={pop} />;
  } catch (error: unknown) {
    console.error("Error loading setup component:", error);
    return (
      <Detail
        markdown="# Error Loading Setup Component\n\nFailed to load the service account setup component. Please try again."
        actions={
          <ActionPanel>
            <Action title="Go Back" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }
}
