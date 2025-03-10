import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { isServiceAccountConfigured } from "../utils/firebase";
import { queryDocuments } from "../api/firestore";
import * as admin from "firebase-admin";

export default function FilterDocuments() {
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
  const [collectionName, setCollectionName] = useState<string>("");
  const [fieldName, setFieldName] = useState<string>("");
  const [operator, setOperator] = useState<string>("==");
  const [fieldValue, setFieldValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
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

  async function handleSubmit() {
    if (!collectionName.trim()) {
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

    setIsLoading(true);
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
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Filter Documents" onSubmit={handleSubmit} />
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
    async function fetchDocuments() {
      try {
        const docs = await queryDocuments(collectionName, fieldName, operator, fieldValue);
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching filtered documents:", error);
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
  }, [collectionName, fieldName, operator, fieldValue]);

  // Format the filter criteria for display
  const formattedValue = typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue);
  const filterDescription = `${fieldName} ${operator} ${formattedValue}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search filtered documents in ${collectionName}...`}
      filtering={true}
    >
      <List.Section title={`Filter: ${filterDescription}`}>
        {error ? (
          <List.EmptyView title="Error Fetching Documents" description={error} icon="⚠️" />
        ) : documents.length === 0 ? (
          <List.EmptyView
            title="No Documents Found"
            description={`No documents found matching the filter criteria`}
            icon="🔍"
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
      </List.Section>
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
