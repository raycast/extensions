import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation, Clipboard, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured, getServiceAccount, resetServiceAccount } from "./utils/firebase";
import { getCollections, getDocuments, queryDocuments, getDocument } from "./api/firestore";
import { JsonViewer } from "./components/JsonViewer";
import * as admin from "firebase-admin";

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
    return <SetupServiceAccountView onComplete={() => setIsConfigured(true)} />;
  }

  return <DocumentsForm />;
}

function DocumentsForm() {
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState<string>("");
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [fieldName, setFieldName] = useState<string>("");
  const [operator, setOperator] = useState<string>("==");
  const [fieldValue, setFieldValue] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const [documentLimit, setDocumentLimit] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const { push, pop } = useNavigation();

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

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    async function fetchCollections() {
      try {
        setIsInitializing(true);
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
          setIsInitializing(false);
        }
      }
    }

    fetchCollections();
    
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleResetServiceAccount() {
    const confirmed = await confirmAlert({
      title: "Reset Service Account",
      message: "Are you sure you want to reset your Firebase service account configuration? You will need to set it up again.",
      primaryAction: {
        title: "Reset",
      },
    });

    if (confirmed) {
      try {
        await resetServiceAccount();
        await showToast({
          style: Toast.Style.Success,
          title: "Service Account Reset",
          message: "Your Firebase service account configuration has been reset.",
        });
        // Redirect to setup page
        pop();
      } catch (error) {
        console.error("Error resetting service account:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Reset Failed",
          message: "Failed to reset service account configuration.",
        });
      }
    }
  }

  async function handleSubmit() {
    if (!collectionName) {
      setError("Collection name is required");
      return;
    }

    // If document ID is provided, fetch that specific document
    if (documentId.trim()) {
      try {
        setIsLoading(true);
        
        const doc = await getDocument(collectionName, documentId.trim());
        
        if (!doc) {
          setError(`Document with ID "${documentId}" not found in collection "${collectionName}"`);
          await showToast({
            style: Toast.Style.Failure,
            title: "Document Not Found",
            message: `Document with ID "${documentId}" not found in collection "${collectionName}"`,
          });
          setIsLoading(false);
          return;
        }

        // Document found, navigate to document detail view
        push(<DocumentDetail document={doc} collectionName={collectionName} />);
        setError(undefined);
      } catch (error) {
        console.error("Error fetching document:", error);
        setError(`Failed to fetch document: ${error instanceof Error ? error.message : String(error)}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch Document",
          message: "An error occurred while fetching the document",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Parse document limit
    let limit: number | undefined = undefined;
    if (documentLimit.trim()) {
      const parsedLimit = parseInt(documentLimit.trim(), 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      } else if (documentLimit.trim() !== "") {
        setError("Document limit must be a positive number");
        await showToast({
          style: Toast.Style.Failure,
          title: "Limit must be a positive number",
        });
        return;
      }
    }

    if (isFiltering) {
      if (!fieldName.trim()) {
        setError("Field name is required for filtering");
        return;
      }

      if (!fieldValue.trim()) {
        setError("Field value is required for filtering");
        return;
      }

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
            limit={limit}
          />
        );
      } catch (error) {
        setError("An unexpected error occurred. Please try again.");
        console.error("Error navigating to filtered document list:", error);
      }
    } else {
      // List all documents
      try {
        push(<DocumentList collectionName={collectionName} limit={limit} />);
      } catch (error) {
        setError("An unexpected error occurred. Please try again.");
        console.error("Error navigating to document list:", error);
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title={documentId.trim() ? "Fetch Document" : (isFiltering ? "Filter Documents" : "List Documents")} 
            onSubmit={handleSubmit} 
          />
          <Action
            title="Reset Service Account"
            onAction={handleResetServiceAccount}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
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
          title={isInitializing ? "Firebase Initializing..." : "No Collections Found"}
          text={error || (isInitializing ? "Please wait while Firebase is being initialized..." : "No collections found in your Firestore database. Please create a collection first.")}
        />
      )}

      <Form.TextField
        id="documentId"
        title="Document ID (Optional)"
        placeholder="Enter document ID to fetch a specific document"
        value={documentId}
        onChange={setDocumentId}
        info="If provided, will fetch this specific document from the selected collection"
      />

      <Form.TextField
        id="documentLimit"
        title="Document Limit"
        placeholder="Leave empty to fetch all documents"
        value={documentLimit}
        onChange={setDocumentLimit}
      />

      <Form.Checkbox
        id="isFiltering"
        label="Filter Documents"
        value={isFiltering}
        onChange={setIsFiltering}
      />

      {isFiltering && (
        <>
          <Form.TextField
            id="fieldName"
            title="Field Name"
            placeholder="Enter field name to filter by"
            value={fieldName}
            onChange={setFieldName}
          />
          <Form.Dropdown
            id="operator"
            title="Comparison Operator"
            value={operator}
            onChange={setOperator}
          >
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
        </>
      )}
    </Form>
  );
}

interface DocumentListProps {
  collectionName: string;
  limit?: number;
}

function DocumentList({ collectionName, limit }: DocumentListProps) {
  const [documents, setDocuments] = useState<admin.firestore.DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string>("");
  const [highlightFields, setHighlightFields] = useState<string>("");
  const { push, pop } = useNavigation();

  // Fetch documents when component mounts or when collection/limit changes
  useEffect(() => {
    loadProjectId();
    fetchDocuments();
  }, [collectionName, limit]);

  // Force re-render when highlightFields changes
  useEffect(() => {
    console.log("Highlight fields updated:", highlightFields);
    // Log the first document structure to understand its format
    if (documents.length > 0) {
      console.log("First document structure:", JSON.stringify(documents[0], null, 2));
    }
  }, [highlightFields, documents]);

  async function loadProjectId() {
    try {
      const serviceAccount = await getServiceAccount();
      if (serviceAccount) {
        setProjectId(serviceAccount.project_id);
      }
    } catch (error) {
      console.error("Error loading project ID:", error);
    }
  }

  async function fetchDocuments() {
    setIsLoading(true);
    setError(undefined);
    try {
      const docs = await getDocuments(collectionName, limit);
      console.log("Fetched documents:", docs);
      if (docs.length > 0) {
        console.log("First document structure:", JSON.stringify(docs[0], null, 2));
        console.log("Document keys:", Object.keys(docs[0]));
        if (docs[0].data) {
          console.log("Document data keys:", Object.keys(docs[0].data));
        }
      }
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError(`Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Documents",
        message: "An error occurred while fetching documents",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const getKeywords = (doc: any): string[] => {
    const keywords: string[] = [];
    
    // Add document ID as a keyword
    if (doc && doc.id) {
      keywords.push(doc.id);
    }
    
    // Add highlighted field values as keywords
    if (doc && doc.data && highlightFields) {
      const fieldArray = highlightFields.split(',');
      for (const field of fieldArray) {
        const trimmedField = field.trim();
        if (trimmedField && doc.data[trimmedField] !== undefined) {
          const value = doc.data[trimmedField];
          if (typeof value === 'object' && value !== null) {
            keywords.push(JSON.stringify(value));
          } else if (value !== null) {
            keywords.push(String(value));
          }
        }
      }
    }
    
    return keywords;
  };

  const getFirestoreUrl = (docId: string): string => {
    if (!projectId) return "";
    return `https://console.firebase.google.com/project/${projectId}/firestore/data/${collectionName}/${docId}`;
  };

  const exportDocumentsToJson = async () => {
    if (documents.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Documents to Export",
      });
      return;
    }

    try {
      // Format the documents as a JSON string
      const jsonData = JSON.stringify(documents.map(doc => ({
        id: doc.id,
        ...doc.data
      })), null, 2);

      // Copy to clipboard
      await Clipboard.copy(jsonData);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Documents Exported to Clipboard",
        message: `${documents.length} documents copied as JSON`,
      });
    } catch (error) {
      console.error("Error exporting documents:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchDocuments} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search documents..."
      navigationTitle={`Documents in ${collectionName}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={fetchDocuments} />
          <Action title="Export to JSON" onAction={exportDocumentsToJson} />
        </ActionPanel>
      }
    >
      <List.Section title="Highlight Fields" subtitle={documents.length > 0 ? `${documents.length} documents` : undefined}>
        <List.Item
          title="Highlight Fields"
          subtitle={highlightFields || "No fields selected"}
          accessories={[{ text: "Edit" }]}
          actions={
            <ActionPanel>
              <Action
                title="Set Highlight Fields"
                onAction={() => {
                  push(
                    <Form
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm
                            title="Save"
                            onSubmit={(values) => {
                              console.log("Setting highlight fields to:", values.highlightFields);
                              setHighlightFields(values.highlightFields);
                              pop();
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.TextField
                        id="highlightFields"
                        title="Highlight Fields"
                        placeholder="Enter comma-separated field names to highlight"
                        defaultValue={highlightFields}
                      />
                    </Form>
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Documents" subtitle={documents.length > 0 ? `${documents.length} documents` : undefined}>
        {documents.map((doc) => {
          // Create a subtitle with highlighted field values
          let subtitle = "";
          
          if (highlightFields && highlightFields.trim() !== "") {
            const fieldNames = highlightFields.split(',').map(f => f.trim()).filter(f => f !== "");
            const fieldValues = [];
            
            for (const fieldName of fieldNames) {
              // Try to access the field directly from the document
              if (doc[fieldName] !== undefined) {
                const value = formatFieldValue(doc[fieldName]);
                fieldValues.push(value);
              } 
              // Also try to access it from doc.data if it exists
              else if (doc.data && doc.data[fieldName] !== undefined) {
                const value = formatFieldValue(doc.data[fieldName]);
                fieldValues.push(value);
              }
            }
            
            subtitle = fieldValues.join(' | ');
          }

          return (
            <List.Item
              key={doc.id}
              title={doc.id}
              subtitle={subtitle}
              actions={
                <ActionPanel>
                  <Action
                    title="View Document"
                    onAction={() => push(<DocumentDetail document={doc} collectionName={collectionName} />)}
                  />
                  <Action
                    title="Copy Document ID"
                    onAction={() => {
                      Clipboard.copy(doc.id);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Document ID Copied",
                      });
                    }}
                  />
                  <Action
                    title="Copy Firestore URL"
                    onAction={() => {
                      const url = getFirestoreUrl(doc.id);
                      Clipboard.copy(url);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Firestore URL Copied",
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

interface FilteredDocumentListProps {
  collectionName: string;
  fieldName: string;
  operator: admin.firestore.WhereFilterOp;
  fieldValue: any;
  limit?: number;
}

function FilteredDocumentList({
  collectionName,
  fieldName,
  operator,
  fieldValue,
  limit,
}: FilteredDocumentListProps) {
  const [documents, setDocuments] = useState<admin.firestore.DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string>("");
  const [highlightFields, setHighlightFields] = useState<string>("");
  const { push, pop } = useNavigation();

  // Fetch documents when component mounts or when filter criteria changes
  useEffect(() => {
    loadProjectId();
    fetchDocuments();
  }, [collectionName, fieldName, operator, fieldValue, limit]);

  // Force re-render when highlightFields changes
  useEffect(() => {
    console.log("Highlight fields updated:", highlightFields);
    // Log the first document structure to understand its format
    if (documents.length > 0) {
      console.log("First document structure:", JSON.stringify(documents[0], null, 2));
    }
  }, [highlightFields, documents]);

  async function loadProjectId() {
    try {
      const serviceAccount = await getServiceAccount();
      if (serviceAccount) {
        setProjectId(serviceAccount.project_id);
      }
    } catch (error) {
      console.error("Error loading project ID:", error);
    }
  }

  async function fetchDocuments() {
    setIsLoading(true);
    setError(undefined);
    try {
      const docs = await queryDocuments(collectionName, fieldName, operator, fieldValue, limit);
      console.log("Fetched filtered documents:", docs);
      if (docs.length > 0) {
        console.log("First document structure:", JSON.stringify(docs[0], null, 2));
        console.log("Document keys:", Object.keys(docs[0]));
        if (docs[0].data) {
          console.log("Document data keys:", Object.keys(docs[0].data));
        }
      }
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError(`Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Documents",
        message: "An error occurred while fetching documents",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Format the field value for display
  const formattedValue = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue);
  const filterDescription = `${fieldName} ${operator} ${formattedValue}`;

  const getKeywords = (doc: any): string[] => {
    const keywords: string[] = [];
    
    // Add document ID as a keyword
    if (doc && doc.id) {
      keywords.push(doc.id);
    }
    
    // Add highlighted field values as keywords
    if (doc && doc.data && highlightFields) {
      const fieldArray = highlightFields.split(',');
      for (const field of fieldArray) {
        const trimmedField = field.trim();
        if (trimmedField && doc.data[trimmedField] !== undefined) {
          const value = doc.data[trimmedField];
          if (typeof value === 'object' && value !== null) {
            keywords.push(JSON.stringify(value));
          } else if (value !== null) {
            keywords.push(String(value));
          }
        }
      }
    }
    
    return keywords;
  };

  const getFirestoreUrl = (docId: string): string => {
    if (!projectId) return "";
    return `https://console.firebase.google.com/project/${projectId}/firestore/data/${collectionName}/${docId}`;
  };

  const exportDocumentsToJson = async () => {
    if (documents.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Documents to Export",
      });
      return;
    }

    try {
      // Format the documents as a JSON string
      const jsonData = JSON.stringify(documents.map(doc => ({
        id: doc.id,
        ...doc.data
      })), null, 2);

      // Copy to clipboard
      await Clipboard.copy(jsonData);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Documents Exported to Clipboard",
        message: `${documents.length} documents copied as JSON`,
      });
    } catch (error) {
      console.error("Error exporting documents:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchDocuments} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search documents..."
      navigationTitle={`Filtered Documents in ${collectionName}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={fetchDocuments} />
          <Action title="Export to JSON" onAction={exportDocumentsToJson} />
        </ActionPanel>
      }
    >
      <List.Section title="Highlight Fields" subtitle={documents.length > 0 ? `${documents.length} documents` : undefined}>
        <List.Item
          title="Highlight Fields"
          subtitle={highlightFields || "No fields selected"}
          accessories={[{ text: "Edit" }]}
          actions={
            <ActionPanel>
              <Action
                title="Set Highlight Fields"
                onAction={() => {
                  push(
                    <Form
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm
                            title="Save"
                            onSubmit={(values) => {
                              console.log("Setting highlight fields to:", values.highlightFields);
                              setHighlightFields(values.highlightFields);
                              pop();
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.TextField
                        id="highlightFields"
                        title="Highlight Fields"
                        placeholder="Enter comma-separated field names to highlight"
                        defaultValue={highlightFields}
                      />
                    </Form>
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Documents" subtitle={`${documents.length} documents matching ${filterDescription}`}>
        {documents.map((doc) => {
          // Create a subtitle with highlighted field values
          let subtitle = "";
          
          if (highlightFields && highlightFields.trim() !== "") {
            const fieldNames = highlightFields.split(',').map(f => f.trim()).filter(f => f !== "");
            const fieldValues = [];
            
            for (const fieldName of fieldNames) {
              // Try to access the field directly from the document
              if (doc[fieldName] !== undefined) {
                const value = formatFieldValue(doc[fieldName]);
                fieldValues.push(value);
              } 
              // Also try to access it from doc.data if it exists
              else if (doc.data && doc.data[fieldName] !== undefined) {
                const value = formatFieldValue(doc.data[fieldName]);
                fieldValues.push(value);
              }
            }
            
            subtitle = fieldValues.join(' | ');
          }

          return (
            <List.Item
              key={doc.id}
              title={doc.id}
              subtitle={subtitle}
              actions={
                <ActionPanel>
                  <Action
                    title="View Document"
                    onAction={() => push(<DocumentDetail document={doc} collectionName={collectionName} />)}
                  />
                  <Action
                    title="Copy Document ID"
                    onAction={() => {
                      Clipboard.copy(doc.id);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Document ID Copied",
                      });
                    }}
                  />
                  <Action
                    title="Copy Firestore URL"
                    onAction={() => {
                      const url = getFirestoreUrl(doc.id);
                      Clipboard.copy(url);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Firestore URL Copied",
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
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

function SetupServiceAccountView({ onComplete }: { onComplete: () => void }) {
  const [serviceAccountJson, setServiceAccountJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!serviceAccountJson.trim()) {
      setError("Service account JSON is required");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      // Import the saveServiceAccount function
      const { saveServiceAccount } = require("./utils/firebase");
      
      const success = await saveServiceAccount(serviceAccountJson);
      
      if (!success) {
        setError("Invalid service account JSON. Please check the format and try again.");
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Service Account",
          message: "The provided service account JSON is invalid.",
        });
        setIsLoading(false);
        return;
      }
      
      await showToast({
        style: Toast.Style.Success,
        title: "Service Account Configured",
        message: "Your Firebase service account has been configured successfully.",
      });
      
      onComplete();
    } catch (error) {
      console.error("Error saving service account:", error);
      setError(`Failed to save service account: ${error instanceof Error ? error.message : String(error)}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Failed",
        message: "Failed to configure service account.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Service Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description
        title="Firebase Service Account Setup"
        text="To use this extension, you need to provide your Firebase service account credentials. You can generate a new private key from the Firebase Console."
      />
      
      <Form.TextArea
        id="serviceAccountJson"
        title="Service Account JSON"
        placeholder="Paste your Firebase service account JSON here"
        value={serviceAccountJson}
        onChange={setServiceAccountJson}
        error={error}
        info="You can generate a new private key from the Firebase Console > Project Settings > Service Accounts > Generate New Private Key"
      />
      
      <Form.Description
        title="How to Get Service Account JSON"
        text={`
1. Go to the Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Copy the contents of the downloaded JSON file and paste it here
        `}
      />
    </Form>
  );
}

/**
 * Formats a field value for display
 */
function formatFieldValue(value: any): string {
  if (value === undefined) {
    return "N/A";
  }
  
  if (value === null) {
    return "null";
  }
  
  if (typeof value === "object") {
    // Handle timestamps
    if (value._seconds !== undefined && value._nanoseconds !== undefined) {
      const date = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
      return date.toLocaleString();
    }
    
    if (value instanceof admin.firestore.Timestamp) {
      return value.toDate().toLocaleString();
    }
    
    // For other objects, convert to string representation
    try {
      const str = JSON.stringify(value);
      // Truncate if too long
      if (str.length > 50) {
        return str.substring(0, 47) + "...";
      }
      return str;
    } catch (e) {
      return "[Object]";
    }
  }
  
  return String(value);
} 