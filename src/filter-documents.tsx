import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured } from "./utils/firebase";
import { getCollections, queryDocuments } from "./api/firestore";
import * as admin from "firebase-admin";
import { JsonViewer } from "./components/JsonViewer";

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
            <Action
              title="Set up Service Account"
              onAction={() => {
                // Import the setup component dynamically to avoid circular dependencies
                const SetupServiceAccount = require("./setup-service-account").default;
                push(<SetupServiceAccount />);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <FilterForm />;
}

function FilterForm() {
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState<string>("");
  const [fieldName, setFieldName] = useState<string>("");
  const [operator, setOperator] = useState<string>("==");
  const [fieldValue, setFieldValue] = useState<string>("");
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

  const operators: { value: admin.firestore.WhereFilterOp; label: string }[] = [
    { value: "==", label: "Equal to (==)" },
    { value: ">", label: "Greater than (>)" },
    { value: "<", label: "Less than (<)" },
    { value: ">=", label: "Greater than or equal to (>=)" },
    { value: "<=", label: "Less than or equal to (<=)" },
    { value: "!=", label: "Not equal to (!=)" },
    { value: "array-contains", label: "Array contains" },
    { value: "array-contains-any", label: "Array contains any" },
    { value: "in", label: "In" },
    { value: "not-in", label: "Not in" },
  ];

  async function handleSubmit() {
    if (!collectionName) {
      setError("Collection name is required");
      return;
    }

    if (!fieldName.trim()) {
      setError("Field name is required");
      return;
    }

    if (!fieldValue.trim()) {
      setError("Field value is required");
      return;
    }

    setError(undefined);

    try {
      // Parse the field value based on the operator
      let parsedValue: any = fieldValue;

      // Try to parse as JSON if it looks like an array or object
      if (
        (fieldValue.startsWith("[") && fieldValue.endsWith("]")) ||
        (fieldValue.startsWith("{") && fieldValue.endsWith("}"))
      ) {
        try {
          parsedValue = JSON.parse(fieldValue);
        } catch (e) {
          // If parsing fails, use the original string value
          console.error("Failed to parse JSON value:", e);
        }
      } else if (fieldValue === "true") {
        parsedValue = true;
      } else if (fieldValue === "false") {
        parsedValue = false;
      } else if (!isNaN(Number(fieldValue))) {
        parsedValue = Number(fieldValue);
      }

      push(
        <FilteredDocumentList
          collectionName={collectionName}
          fieldName={fieldName}
          operator={operator as admin.firestore.WhereFilterOp}
          fieldValue={parsedValue}
        />,
      );
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Error navigating to filtered document list:", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Filter Documents" onSubmit={handleSubmit} />
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
      <Form.TextField
        id="fieldName"
        title="Field Name"
        placeholder="Enter field name to filter by"
        value={fieldName}
        onChange={setFieldName}
      />
      <Form.Dropdown id="operator" title="Comparison Operator" value={operator} onChange={setOperator}>
        {operators.map((op) => (
          <Form.Dropdown.Item key={op.value} value={op.value} title={op.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="fieldValue"
        title="Field Value"
        placeholder="Enter value to compare against"
        value={fieldValue}
        onChange={setFieldValue}
        info='For arrays or objects, use JSON format: [1,2,3] or {"key":"value"}'
      />
    </Form>
  );
}

interface FilteredDocumentListProps {
  collectionName: string;
  fieldName: string;
  operator: admin.firestore.WhereFilterOp;
  fieldValue: any;
}

function FilteredDocumentList({ collectionName, fieldName, operator, fieldValue }: FilteredDocumentListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    async function fetchDocuments() {
      try {
        const docs = await queryDocuments(collectionName, fieldName, operator, fieldValue);
        if (isMounted) {
          setDocuments(docs);
          setError(undefined);
        }
      } catch (error) {
        console.error("Error fetching filtered documents:", error);
        if (isMounted) {
          if (retryCount < maxRetries) {
            retryCount++;
            // Wait a bit longer between retries
            setTimeout(fetchDocuments, 1000 * retryCount);
            return;
          }

          setError("Failed to fetch documents. Please try again.");
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Fetch Documents",
            message: `Error fetching documents from ${collectionName}`,
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
  }, [collectionName, fieldName, operator, fieldValue]);

  // Format the filter criteria for display
  const formattedValue = typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue);
  const filterDescription = `${fieldName} ${operator} ${formattedValue}`;

  if (error) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
        filtering={true}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={() => {
                setIsLoading(true);
                setError(undefined);
                queryDocuments(collectionName, fieldName, operator, fieldValue)
                  .then((docs) => {
                    setDocuments(docs);
                  })
                  .catch((error) => {
                    console.error("Error fetching filtered documents:", error);
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
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
        filtering={true}
      >
        <List.EmptyView
          title="No Documents Found"
          description={`No documents found matching the filter criteria`}
          icon="🔍"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
      filtering={true}
    >
      <List.Section title={`Filter: ${filterDescription}`}>
        {documents.map((doc) => (
          <List.Item
            key={`${doc.id}-${collectionName}-${fieldName}`}
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
      </List.Section>
    </List>
  );
}

interface DocumentDetailProps {
  document: any;
  collectionName: string;
}

function DocumentDetail({ document, collectionName }: DocumentDetailProps) {
  return <JsonViewer data={document} title={`Document in ${collectionName}`} />;
}
