import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured, getServiceAccount } from "./utils/firebase";
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
    return (
      <Detail
        markdown="# Firebase Service Account Not Configured\n\nYou need to set up your Firebase service account before you can use this extension.\n\nClick the 'Set Up Service Account' button below to configure your Firebase service account."
        actions={
          <ActionPanel>
            <Action
              title="Set Up Service Account"
              onAction={() => push(<SetupServiceAccountView />)}
            />
          </ActionPanel>
        }
      />
    );
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
  const [highlightFields, setHighlightFields] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const { push } = useNavigation();

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

    // Process highlight fields
    let highlightFieldsArray: string[] = [];
    if (highlightFields.trim()) {
      highlightFieldsArray = highlightFields.split(',').map(field => field.trim()).filter(Boolean);
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
            highlightFields={highlightFieldsArray}
          />
        );
      } catch (error) {
        setError("An unexpected error occurred. Please try again.");
        console.error("Error navigating to filtered document list:", error);
      }
    } else {
      // List all documents
      try {
        push(<DocumentList collectionName={collectionName} highlightFields={highlightFieldsArray} />);
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

      <Form.Checkbox
        id="isFiltering"
        label="Filter Documents"
        value={isFiltering}
        onChange={setIsFiltering}
        info="Enable to filter documents by field value"
      />

      <Form.TextField
        id="highlightFields"
        title="Highlight Fields"
        placeholder="Enter field names to highlight (comma-separated)"
        value={highlightFields}
        onChange={setHighlightFields}
        info="Fields to highlight in the document list. Separate multiple fields with commas."
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
  highlightFields: string[];
}

function DocumentList({ collectionName, highlightFields }: DocumentListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string>("");
  const { push } = useNavigation();

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
      } catch (error) {
        console.error("Error fetching documents:", error);
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
  }, [collectionName]);

  // Function to create keywords from document fields for search
  const getKeywords = (doc: any): string[] => {
    const keywords: string[] = [doc.id]; // Start with document ID
    
    // Add highlighted field values to keywords
    highlightFields.forEach(field => {
      if (doc[field] !== undefined) {
        const value = formatFieldValue(doc[field]);
        keywords.push(value);
        keywords.push(`${field}:${value}`);
      }
    });
    
    return keywords;
  };

  // Function to generate Firestore URL for a document
  const getFirestoreUrl = (docId: string): string => {
    // Encode collection name and document ID for URL
    const encodedCollection = collectionName.replace(/\//g, '~2F');
    const encodedDocId = docId.replace(/\//g, '~2F');
    
    return `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2F${encodedCollection}~2F${encodedDocId}`;
  };

  // Function to export all documents to JSON
  const exportDocumentsToJson = async () => {
    try {
      // Ensure documents have id field
      const docsWithId = documents.map(doc => {
        // Create a copy of the document to avoid modifying the original
        const docCopy = { ...doc };
        
        // If the document doesn't already have an id field in its data (not the Firestore ID)
        if (!docCopy.hasOwnProperty('id')) {
          docCopy.id = doc.id;
        }
        
        return docCopy;
      });
      
      // Create JSON string
      const jsonData = JSON.stringify(docsWithId, null, 2);
      
      // Copy JSON to clipboard
      await Clipboard.copy(jsonData);
      
      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Documents Exported",
        message: "JSON data copied to clipboard",
      });
      
    } catch (error) {
      console.error("Error exporting documents:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: "Failed to export documents to JSON",
      });
    }
  };

  if (error) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search documents in ${collectionName}...`}
        filtering={true}
        navigationTitle={`${collectionName} - Error`}
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
        <List.EmptyView
          title="Error Fetching Documents"
          description={error}
          icon="⚠️"
        />
      </List>
    );
  }

  if (documents.length === 0) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search documents in ${collectionName}...`}
        filtering={true}
        navigationTitle={`${collectionName} (0 documents)`}
      >
        <List.EmptyView
          title="No Documents Found"
          description={`No documents found in the collection '${collectionName}'. Try creating a document in Firebase Console.`}
          icon="📄"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search documents in ${collectionName}...`}
      filtering={true}
      navigationTitle={`${collectionName} (${documents.length} documents)`}
    >
      {/* Add a header row to show field names */}
      {documents.length > 0 && highlightFields.length > 0 && (
        <List.Section title="Fields">
          <List.Item
            title="ID"
            subtitle={highlightFields.join(' | ')}
          />
        </List.Section>
      )}

      <List.Section 
        title={`${documents.length} documents in ${collectionName}`}
        subtitle={documents.length > 0 ? "⌘E to export all documents" : undefined}
      >
        {documents.map((doc) => {
          // Create a formatted string with just field values separated by |
          const fieldValues = highlightFields.map(field => {
            const value = doc[field];
            return formatFieldValue(value);
          }).join(' | ');
          
          return (
            <List.Item
              key={`${doc.id}-${collectionName}`}
              title={doc.id}
              subtitle={fieldValues}
              keywords={getKeywords(doc)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Document"
                    onAction={() => push(<DocumentDetail document={doc} collectionName={collectionName} />)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Document ID"
                    content={doc.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Firestore URL"
                    content={getFirestoreUrl(doc.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Export All Documents to JSON"
                    onAction={exportDocumentsToJson}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
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
  highlightFields: string[];
}

function FilteredDocumentList({
  collectionName,
  fieldName,
  operator,
  fieldValue,
  highlightFields,
}: FilteredDocumentListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string>("");
  const { push } = useNavigation();

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
  let formattedValue = typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue);
  const filterDescription = `${fieldName} ${operator} ${formattedValue}`;

  // Function to create keywords from document fields for search
  const getKeywords = (doc: any): string[] => {
    const keywords: string[] = [doc.id]; // Start with document ID
    
    // Add highlighted field values to keywords
    highlightFields.forEach(field => {
      if (doc[field] !== undefined) {
        const value = formatFieldValue(doc[field]);
        keywords.push(value);
        keywords.push(`${field}:${value}`);
      }
    });
    
    return keywords;
  };

  // Function to generate Firestore URL for a document
  const getFirestoreUrl = (docId: string): string => {
    // Encode collection name and document ID for URL
    const encodedCollection = collectionName.replace(/\//g, '~2F');
    const encodedDocId = docId.replace(/\//g, '~2F');
    
    return `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2F${encodedCollection}~2F${encodedDocId}`;
  };

  // Function to export all documents to JSON
  const exportDocumentsToJson = async () => {
    try {
      // Ensure documents have id field
      const docsWithId = documents.map(doc => {
        // Create a copy of the document to avoid modifying the original
        const docCopy = { ...doc };
        
        // If the document doesn't already have an id field in its data (not the Firestore ID)
        if (!docCopy.hasOwnProperty('id')) {
          docCopy.id = doc.id;
        }
        
        return docCopy;
      });
      
      // Create JSON string
      const jsonData = JSON.stringify(docsWithId, null, 2);
      
      // Copy JSON to clipboard
      await Clipboard.copy(jsonData);
      
      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Documents Exported",
        message: "JSON data copied to clipboard",
      });
      
    } catch (error) {
      console.error("Error exporting documents:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: "Failed to export documents to JSON",
      });
    }
  };

  if (error) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
        filtering={true}
        navigationTitle={`${collectionName} - Error`}
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
        <List.EmptyView
          title="Error Fetching Documents"
          description={error}
          icon="⚠️"
        />
      </List>
    );
  }

  if (documents.length === 0) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
        filtering={true}
        navigationTitle={`${collectionName} (0 documents)`}
      >
        <List.EmptyView
          title="No Documents Match Filter"
          description={`No documents found matching the filter criteria: ${filterDescription}`}
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
      navigationTitle={`${collectionName} (${documents.length} documents)`}
    >
      {/* Add a header row to show field names */}
      {documents.length > 0 && highlightFields.length > 0 && (
        <List.Section title="Fields">
          <List.Item
            title="ID"
            subtitle={highlightFields.join(' | ')}
          />
        </List.Section>
      )}

      <List.Section 
        title={`${documents.length} documents matching filter: ${filterDescription}`}
        subtitle={documents.length > 0 ? "⌘E to export all documents" : undefined}
      >
        {documents.map((doc) => {
          // Create a formatted string with just field values separated by |
          const fieldValues = highlightFields.map(field => {
            const value = doc[field];
            return formatFieldValue(value);
          }).join(' | ');
          
          return (
            <List.Item
              key={`${doc.id}-${collectionName}-${fieldName}`}
              title={doc.id}
              subtitle={fieldValues}
              keywords={getKeywords(doc)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Document"
                    onAction={() => push(<DocumentDetail document={doc} collectionName={collectionName} />)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Document ID"
                    content={doc.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Firestore URL"
                    content={getFirestoreUrl(doc.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Export All Documents to JSON"
                    onAction={exportDocumentsToJson}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
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