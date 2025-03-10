import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState, useRef } from "react";
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
  const collectionDropdownRef = useRef<Form.Dropdown>(null);

  const operators: { value: admin.firestore.WhereFilterOp; label: string }[] = [
    { value: "==", label: "Equals (==)" },
    { value: "!=", label: "Not equals (!=)" },
    { value: "<", label: "Less than (<)" },
    { value: "<=", label: "Less than or equal to (<=)" },
    { value: ">", label: "Greater than (>)" },
    { value: ">=", label: "Greater than or equal to (>=)" },
    { value: "array-contains", label: "Array contains" },
    { value: "array-contains-any", label: "Array contains any" },
    { value: "in", label: "In" },
    { value: "not-in", label: "Not in" },
  ];

  useEffect(() => {
    fetchCollections();
  }, []);

  // Focus on collection dropdown search field once collections are loaded
  useEffect(() => {
    if (collections.length > 0 && isInitializing) {
      setIsInitializing(false);
      // Use setTimeout to ensure the dropdown is fully rendered
      setTimeout(() => {
        if (collectionDropdownRef.current) {
          collectionDropdownRef.current.focus();
        }
      }, 100);
    }
  }, [collections, isInitializing]);

  async function fetchCollections() {
    setIsLoading(true);
    try {
      const fetchedCollections = await getCollections();
      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      setError("Failed to fetch collections. Please try again.");
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Collections",
        message: "An error occurred while fetching collections",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetServiceAccount() {
    const confirmed = await confirmAlert({
      title: "Reset Service Account",
      message:
        "Are you sure you want to reset your Firebase service account configuration? You will need to set it up again.",
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
          />,
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action title="Reset Service Account" onAction={handleResetServiceAccount} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="collection"
        title="Collection"
        placeholder="Select a collection"
        value={collectionName}
        onChange={setCollectionName}
        ref={collectionDropdownRef}
      >
        {collections.map((collection) => (
          <Form.Dropdown.Item key={collection} value={collection} title={collection} />
        ))}
      </Form.Dropdown>

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

      <Form.Checkbox id="isFiltering" label="Filter Documents" value={isFiltering} onChange={setIsFiltering} />

      {isFiltering && (
        <>
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [highlightFields, setHighlightFields] = useState<string>("");
  const { push, pop } = useNavigation();

  // For custom search implementation
  const [searchText, setSearchText] = useState<string>("");
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);

  // For sorting functionality
  const [sortField, setSortField] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadProjectId();
    fetchDocuments();
  }, [collectionName]);

  // Filter documents whenever search text or documents change
  useEffect(() => {
    filterDocuments();
  }, [searchText, documents, highlightFields]);

  // Sort documents whenever sort field, sort order, or filtered documents change
  useEffect(() => {
    // Only sort if we're not in the middle of filtering
    // This prevents overriding the filtered results
    if (!searchText || searchText.trim() === "") {
      sortDocuments();
    }
  }, [sortField, sortOrder, documents]);

  // Custom document filtering function
  const filterDocuments = () => {
    // If no search text, show all documents and sort them
    if (!searchText || searchText.trim() === "") {
      // Don't set filtered documents directly, let the sort function handle it
      sortDocuments();
      return;
    }

    const searchLower = searchText.toLowerCase().trim();
    console.log(`Filtering with search text: "${searchLower}"`);
    console.log(`Total documents to search: ${documents.length}`);

    // Get highlighted fields array
    const highlightFieldsArray = highlightFields
      ? highlightFields
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    console.log("Highlight fields:", highlightFieldsArray);

    // Filter documents
    const filtered = documents.filter((doc) => {
      console.log(`\nChecking document ${doc.id}:`);

      // Document data is directly on the document object, not in a 'data' property
      const docData = { ...doc };
      delete docData.id; // Remove id from data object to avoid duplication

      console.log(`Document data keys:`, Object.keys(docData));

      // Check document ID
      if (doc.id.toLowerCase().includes(searchLower)) {
        console.log(`✅ Document ${doc.id} matches by ID`);
        return true;
      }

      // First check highlighted fields
      for (const field of highlightFieldsArray) {
        if (doc[field] !== undefined) {
          const value = doc[field];
          if (value === null) continue;

          const stringValue =
            typeof value === "object" ? JSON.stringify(value).toLowerCase() : String(value).toLowerCase();

          console.log(`Checking highlighted field "${field}" with value "${stringValue}"`);

          if (stringValue.includes(searchLower)) {
            console.log(`✅ Document ${doc.id} matches by highlighted field "${field}" with value "${stringValue}"`);
            return true;
          }
        } else {
          console.log(`Highlighted field "${field}" not found in document ${doc.id}`);
        }
      }

      // Then check all other fields
      for (const [key, value] of Object.entries(docData)) {
        if (value === null || value === undefined) continue;

        const stringValue =
          typeof value === "object" ? JSON.stringify(value).toLowerCase() : String(value).toLowerCase();

        console.log(`Checking field "${key}" with value "${stringValue}"`);

        if (stringValue.includes(searchLower)) {
          console.log(`✅ Document ${doc.id} matches by field "${key}" with value "${stringValue}"`);
          return true;
        }
      }

      console.log(`❌ Document ${doc.id} does not match search criteria`);
      return false;
    });

    console.log(`Filtered ${documents.length} documents to ${filtered.length} matches`);

    // Sort the filtered documents
    const sorted = sortDocumentArray(filtered);
    setFilteredDocuments(sorted);
  };

  // Sort documents based on selected field and order
  const sortDocuments = () => {
    if (!documents.length) return;

    console.log(`Sorting by ${sortField} in ${sortOrder} order`);

    const sorted = sortDocumentArray(documents);
    setFilteredDocuments(sorted);
  };

  // Helper function to sort an array of documents
  const sortDocumentArray = (docs: any[]) => {
    return [...docs].sort((a, b) => {
      let valueA = sortField === "id" ? a.id : a[sortField];
      let valueB = sortField === "id" ? b.id : b[sortField];

      // Handle undefined or null values
      if (valueA === undefined || valueA === null) valueA = "";
      if (valueB === undefined || valueB === null) valueB = "";

      // Determine the type of values and compare accordingly
      const typeA = typeof valueA;
      const typeB = typeof valueB;

      // If both values are numbers, compare them numerically
      if (typeA === "number" && typeB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      // If both values are dates, compare them as dates
      const isDateA = valueA instanceof Date || (typeof valueA === "string" && !isNaN(Date.parse(valueA)));
      const isDateB = valueB instanceof Date || (typeof valueB === "string" && !isNaN(Date.parse(valueB)));

      if (isDateA && isDateB) {
        const dateA = valueA instanceof Date ? valueA : new Date(valueA);
        const dateB = valueB instanceof Date ? valueB : new Date(valueB);
        return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }

      // If both values are booleans, compare them as booleans
      if (typeA === "boolean" && typeB === "boolean") {
        if (sortOrder === "asc") {
          return valueA === valueB ? 0 : valueA ? 1 : -1;
        } else {
          return valueA === valueB ? 0 : valueA ? -1 : 1;
        }
      }

      // For mixed types or strings, convert to strings and compare
      const stringA = String(valueA).toLowerCase();
      const stringB = String(valueB).toLowerCase();

      // Case insensitive comparison
      const comparison = stringA.localeCompare(stringB);

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

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
    setError(null);
    try {
      const docs = await getDocuments(collectionName, limit);
      console.log("Fetched documents:", docs);

      // Log detailed structure of the first document
      if (docs.length > 0) {
        console.log("First document structure:", JSON.stringify(docs[0], null, 2));
        console.log("Document keys:", Object.keys(docs[0]));
        if (docs[0].data) {
          console.log("Document data keys:", Object.keys(docs[0].data));
          console.log("Document data values:", Object.values(docs[0].data));
        }
      }

      setDocuments(docs);
      setFilteredDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError(String(error));
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Documents",
        message: "An error occurred while fetching documents",
      });
    } finally {
      setIsLoading(false);
    }
  }

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
      const jsonData = JSON.stringify(
        documents.map((doc) => ({
          id: doc.id,
          ...doc.data,
        })),
        null,
        2,
      );

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
      searchBarPlaceholder="Search documents by ID or field values..."
      navigationTitle={`Documents in ${collectionName}`}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={fetchDocuments} />
          <Action title="Export to JSON" onAction={exportDocumentsToJson} />
        </ActionPanel>
      }
    >
      <List.Section subtitle={documents.length > 0 ? `${documents.length} documents` : undefined}>
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
                    </Form>,
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section>
        <List.Item
          title="Sort Options"
          subtitle={`Sort by ${sortField} (${sortOrder === "asc" ? "Ascending" : "Descending"})`}
          accessories={[{ text: "Edit" }]}
          actions={
            <ActionPanel>
              <Action
                title="Set Sort Options"
                onAction={() => {
                  // Get highlighted fields for dropdown options
                  const highlightFieldsArray = highlightFields
                    ? highlightFields
                        .split(",")
                        .map((f) => f.trim())
                        .filter(Boolean)
                    : [];

                  // Always include document ID
                  const sortFieldOptions = ["id", ...highlightFieldsArray];

                  push(
                    <Form
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm
                            title="Save"
                            onSubmit={(values) => {
                              console.log("Setting sort options:", values);
                              setSortField(values.sortField);
                              setSortOrder(values.sortOrder);
                              pop();
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.Dropdown id="sortField" title="Sort Field" defaultValue={sortField}>
                        {sortFieldOptions.map((field) => (
                          <Form.Dropdown.Item key={field} value={field} title={field} />
                        ))}
                      </Form.Dropdown>

                      <Form.Dropdown id="sortOrder" title="Sort By" defaultValue={sortOrder}>
                        <Form.Dropdown.Item value="asc" title="Ascending" />
                        <Form.Dropdown.Item value="desc" title="Descending" />
                      </Form.Dropdown>
                    </Form>,
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Documents"
        subtitle={documents.length > 0 ? `${filteredDocuments.length} of ${documents.length} documents` : undefined}
      >
        {filteredDocuments.map((doc) => {
          // Create a subtitle with highlighted field values
          let subtitle = "";

          if (highlightFields && highlightFields.trim() !== "") {
            const fieldNames = highlightFields
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f !== "");
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

            subtitle = fieldValues.join(" | ");
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
                    title="Copy Document Id"
                    onAction={async () => {
                      await Clipboard.copy(doc.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Document ID Copied",
                      });
                    }}
                  />
                  <Action.OpenInBrowser title="Open Doc in Browser" url={getFirestoreUrl(doc.id)} />
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

function FilteredDocumentList({ collectionName, fieldName, operator, fieldValue, limit }: FilteredDocumentListProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [highlightFields, setHighlightFields] = useState<string>("");
  const { push, pop } = useNavigation();

  // For custom search implementation
  const [searchText, setSearchText] = useState<string>("");
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);

  // For sorting functionality
  const [sortField, setSortField] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadProjectId();
    fetchDocuments();
  }, [collectionName, fieldName, operator, fieldValue]);

  // Filter documents whenever search text or documents change
  useEffect(() => {
    filterDocuments();
  }, [searchText, documents, highlightFields]);

  // Sort documents whenever sort field, sort order, or filtered documents change
  useEffect(() => {
    // Only sort if we're not in the middle of filtering
    // This prevents overriding the filtered results
    if (!searchText || searchText.trim() === "") {
      sortDocuments();
    }
  }, [sortField, sortOrder, documents]);

  // Custom document filtering function
  const filterDocuments = () => {
    // If no search text, show all documents and sort them
    if (!searchText || searchText.trim() === "") {
      // Don't set filtered documents directly, let the sort function handle it
      sortDocuments();
      return;
    }

    const searchLower = searchText.toLowerCase().trim();
    console.log(`Filtering with search text: "${searchLower}"`);
    console.log(`Total documents to search: ${documents.length}`);

    // Get highlighted fields array
    const highlightFieldsArray = highlightFields
      ? highlightFields
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    console.log("Highlight fields:", highlightFieldsArray);

    // Filter documents
    const filtered = documents.filter((doc) => {
      console.log(`\nChecking document ${doc.id}:`);

      // Document data is directly on the document object, not in a 'data' property
      const docData = { ...doc };
      delete docData.id; // Remove id from data object to avoid duplication

      console.log(`Document data keys:`, Object.keys(docData));

      // Check document ID
      if (doc.id.toLowerCase().includes(searchLower)) {
        console.log(`✅ Document ${doc.id} matches by ID`);
        return true;
      }

      // First check highlighted fields
      for (const field of highlightFieldsArray) {
        if (doc[field] !== undefined) {
          const value = doc[field];
          if (value === null) continue;

          const stringValue =
            typeof value === "object" ? JSON.stringify(value).toLowerCase() : String(value).toLowerCase();

          console.log(`Checking highlighted field "${field}" with value "${stringValue}"`);

          if (stringValue.includes(searchLower)) {
            console.log(`✅ Document ${doc.id} matches by highlighted field "${field}" with value "${stringValue}"`);
            return true;
          }
        } else {
          console.log(`Highlighted field "${field}" not found in document ${doc.id}`);
        }
      }

      // Then check all other fields
      for (const [key, value] of Object.entries(docData)) {
        if (value === null || value === undefined) continue;

        const stringValue =
          typeof value === "object" ? JSON.stringify(value).toLowerCase() : String(value).toLowerCase();

        console.log(`Checking field "${key}" with value "${stringValue}"`);

        if (stringValue.includes(searchLower)) {
          console.log(`✅ Document ${doc.id} matches by field "${key}" with value "${stringValue}"`);
          return true;
        }
      }

      console.log(`❌ Document ${doc.id} does not match search criteria`);
      return false;
    });

    console.log(`Filtered ${documents.length} documents to ${filtered.length} matches`);

    // Sort the filtered documents
    const sorted = sortDocumentArray(filtered);
    setFilteredDocuments(sorted);
  };

  // Sort documents based on selected field and order
  const sortDocuments = () => {
    if (!documents.length) return;

    console.log(`Sorting by ${sortField} in ${sortOrder} order`);

    const sorted = sortDocumentArray(documents);
    setFilteredDocuments(sorted);
  };

  // Helper function to sort an array of documents
  const sortDocumentArray = (docs: any[]) => {
    return [...docs].sort((a, b) => {
      let valueA = sortField === "id" ? a.id : a[sortField];
      let valueB = sortField === "id" ? b.id : b[sortField];

      // Handle undefined or null values
      if (valueA === undefined || valueA === null) valueA = "";
      if (valueB === undefined || valueB === null) valueB = "";

      // Determine the type of values and compare accordingly
      const typeA = typeof valueA;
      const typeB = typeof valueB;

      // If both values are numbers, compare them numerically
      if (typeA === "number" && typeB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      // If both values are dates, compare them as dates
      const isDateA = valueA instanceof Date || (typeof valueA === "string" && !isNaN(Date.parse(valueA)));
      const isDateB = valueB instanceof Date || (typeof valueB === "string" && !isNaN(Date.parse(valueB)));

      if (isDateA && isDateB) {
        const dateA = valueA instanceof Date ? valueA : new Date(valueA);
        const dateB = valueB instanceof Date ? valueB : new Date(valueB);
        return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }

      // If both values are booleans, compare them as booleans
      if (typeA === "boolean" && typeB === "boolean") {
        if (sortOrder === "asc") {
          return valueA === valueB ? 0 : valueA ? 1 : -1;
        } else {
          return valueA === valueB ? 0 : valueA ? -1 : 1;
        }
      }

      // For mixed types or strings, convert to strings and compare
      const stringA = String(valueA).toLowerCase();
      const stringB = String(valueB).toLowerCase();

      // Case insensitive comparison
      const comparison = stringA.localeCompare(stringB);

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

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
    setError(null);
    try {
      const docs = await queryDocuments(collectionName, fieldName, operator, fieldValue, limit);
      console.log("Fetched documents:", docs);
      setDocuments(docs);
      setFilteredDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  }

  // Format the field value for display
  const formattedValue = typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue);
  const filterDescription = `${fieldName} ${operator} ${formattedValue}`;

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
      const jsonData = JSON.stringify(
        documents.map((doc) => ({
          id: doc.id,
          ...doc.data,
        })),
        null,
        2,
      );

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
      searchBarPlaceholder="Search documents by ID or field values..."
      navigationTitle={`Filtered Documents in ${collectionName}`}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={fetchDocuments} />
          <Action title="Export to JSON" onAction={exportDocumentsToJson} />
        </ActionPanel>
      }
    >
      <List.Section subtitle={documents.length > 0 ? `${documents.length} documents` : undefined}>
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
                    </Form>,
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section>
        <List.Item
          title="Sort Options"
          subtitle={`Sort by ${sortField} (${sortOrder === "asc" ? "Ascending" : "Descending"})`}
          accessories={[{ text: "Edit" }]}
          actions={
            <ActionPanel>
              <Action
                title="Set Sort Options"
                onAction={() => {
                  // Get highlighted fields for dropdown options
                  const highlightFieldsArray = highlightFields
                    ? highlightFields
                        .split(",")
                        .map((f) => f.trim())
                        .filter(Boolean)
                    : [];

                  // Always include document ID
                  const sortFieldOptions = ["id", ...highlightFieldsArray];

                  push(
                    <Form
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm
                            title="Save"
                            onSubmit={(values) => {
                              console.log("Setting sort options:", values);
                              setSortField(values.sortField);
                              setSortOrder(values.sortOrder);
                              pop();
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.Dropdown id="sortField" title="Sort Field" defaultValue={sortField}>
                        {sortFieldOptions.map((field) => (
                          <Form.Dropdown.Item key={field} value={field} title={field} />
                        ))}
                      </Form.Dropdown>

                      <Form.Dropdown id="sortOrder" title="Sort By" defaultValue={sortOrder}>
                        <Form.Dropdown.Item value="asc" title="Ascending" />
                        <Form.Dropdown.Item value="desc" title="Descending" />
                      </Form.Dropdown>
                    </Form>,
                  );
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Documents"
        subtitle={`${filteredDocuments.length} of ${documents.length} documents matching ${filterDescription}`}
      >
        {filteredDocuments.map((doc) => {
          // Create a subtitle with highlighted field values
          let subtitle = "";

          if (highlightFields && highlightFields.trim() !== "") {
            const fieldNames = highlightFields
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f !== "");
            const highlightedValues = fieldNames
              .map((field) => {
                if (doc[field] !== undefined) {
                  return `${field}: ${formatFieldValue(doc[field])}`;
                }
                return null;
              })
              .filter(Boolean);

            subtitle = highlightedValues.join(" | ");
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
                    onAction={() => {
                      push(<DocumentDetail document={doc} collectionName={collectionName} />);
                    }}
                  />
                  <Action.OpenInBrowser title="Open in Firebase Console" url={getFirestoreUrl(doc.id)} />
                  <Action
                    title="Copy Document Id"
                    onAction={async () => {
                      await Clipboard.copy(doc.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Document ID Copied",
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
