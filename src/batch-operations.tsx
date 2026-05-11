import { useEffect, useState, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Alert,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import {
  countWorkflows,
  batchCancelWorkflows,
  batchTerminateWorkflows,
  listNamespaces,
  setCurrentNamespace,
} from "./lib/temporal-client";
import { Preferences, NamespaceInfo } from "./lib/types";
import { getSelectedNamespace, setSelectedNamespace } from "./lib/storage";

type BatchOperation = "cancel" | "terminate";

const EXAMPLE_QUERIES = [
  { title: "All Running", query: 'ExecutionStatus = "Running"' },
  { title: "Failed Today", query: 'ExecutionStatus = "Failed" AND StartTime > now() - 24h' },
  {
    title: "By Workflow Type",
    query: 'WorkflowType = "MyWorkflow" AND ExecutionStatus = "Running"',
  },
  { title: "By Task Queue", query: 'TaskQueue = "my-task-queue" AND ExecutionStatus = "Running"' },
  { title: "Older Than 7 Days", query: 'ExecutionStatus = "Running" AND StartTime < now() - 7d' },
];

export default function BatchOperations() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [operation, setOperation] = useState<BatchOperation>("cancel");
  const [query, setQuery] = useState('ExecutionStatus = "Running"');
  const [reason, setReason] = useState("Batch operation via Raycast");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | undefined>();
  const prefs = getPreferenceValues<Preferences>();

  // Fetch namespaces on mount
  useEffect(() => {
    async function init() {
      try {
        const ns = await listNamespaces();
        setNamespaces(ns.length > 0 ? ns : [{ name: prefs.namespace, state: "Registered" }]);
      } catch {
        setNamespaces([{ name: prefs.namespace, state: "Registered" }]);
      }

      const stored = await getSelectedNamespace();
      const namespace = stored || prefs.namespace;
      setSelectedNamespaceState(namespace);
      setCurrentNamespace(namespace);
    }
    init();
  }, [prefs.namespace]);

  // Handle namespace change
  const handleNamespaceChange = useCallback(async (namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    await setSelectedNamespace(namespace);
    setPreviewCount(null); // Reset preview when namespace changes
  }, []);

  // Preview count
  const handlePreview = async () => {
    if (!query.trim()) {
      setQueryError("Query is required");
      return;
    }

    setIsLoading(true);
    setQueryError(undefined);

    try {
      const count = await countWorkflows(query);
      setPreviewCount(count);

      await showToast({
        style: Toast.Style.Success,
        title: "Preview Complete",
        message: `${count} workflows match this query`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQueryError(message);
      setPreviewCount(null);

      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Query",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute batch operation
  const handleSubmit = async () => {
    if (!query.trim()) {
      setQueryError("Query is required");
      return;
    }

    if (!reason.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reason Required",
        message: "Please provide a reason for the batch operation",
      });
      return;
    }

    // Get current count
    setIsLoading(true);
    let count: number;

    try {
      count = await countWorkflows(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQueryError(message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    if (count === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Workflows",
        message: "No workflows match this query",
      });
      return;
    }

    // Confirm operation
    const operationName = operation === "cancel" ? "Cancel" : "Terminate";
    const confirmed = await confirmAlert({
      title: `Batch ${operationName}`,
      message: `Are you sure you want to ${operation} ${count} workflow(s)?\n\nQuery: ${query}\n\n${
        operation === "terminate"
          ? "WARNING: Termination is immediate and cannot be undone!"
          : "Cancellation sends a request that workflows can handle gracefully."
      }`,
      primaryAction: {
        title: `${operationName} ${count} Workflows`,
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Batch ${operationName}...`,
        message: `Processing ${count} workflows`,
      });

      let jobId: string;

      if (operation === "cancel") {
        const result = await batchCancelWorkflows(query, reason);
        jobId = result.jobId;
      } else {
        const result = await batchTerminateWorkflows(query, reason);
        jobId = result.jobId;
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Batch ${operationName} Started`,
        message: `Job ID: ${jobId.substring(0, 8)}... (${count} workflows)`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Batch ${operationName} Failed`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Batch Operations"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={operation === "cancel" ? "Cancel Workflows" : "Terminate Workflows"}
            icon={operation === "cancel" ? Icon.Stop : Icon.Trash}
            onSubmit={handleSubmit}
          />
          <Action
            title="Preview Count"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={handlePreview}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="namespace"
        title="Namespace"
        value={selectedNamespace}
        onChange={handleNamespaceChange}
      >
        {namespaces.map((ns) => (
          <Form.Dropdown.Item key={ns.name} value={ns.name} title={ns.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="operation"
        title="Operation"
        value={operation}
        onChange={(value) => setOperation(value as BatchOperation)}
      >
        <Form.Dropdown.Item value="cancel" title="Cancel" icon={Icon.Stop} />
        <Form.Dropdown.Item value="terminate" title="Terminate" icon={Icon.Trash} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="query"
        title="Visibility Query"
        placeholder='ExecutionStatus = "Running"'
        value={query}
        onChange={(value) => {
          setQuery(value);
          setQueryError(undefined);
          setPreviewCount(null);
        }}
        error={queryError}
        info="Temporal visibility query to select workflows"
      />

      <Form.Dropdown
        id="examples"
        title="Example Queries"
        value=""
        onChange={(value) => {
          if (value) {
            setQuery(value);
            setQueryError(undefined);
            setPreviewCount(null);
          }
        }}
      >
        <Form.Dropdown.Item value="" title="Select an example..." />
        {EXAMPLE_QUERIES.map((example) => (
          <Form.Dropdown.Item key={example.title} value={example.query} title={example.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="reason"
        title="Reason"
        placeholder="Reason for batch operation"
        value={reason}
        onChange={setReason}
        info="Provide a reason for auditing purposes"
      />

      <Form.Separator />

      <Form.Description
        title="Preview"
        text={
          previewCount !== null
            ? `${previewCount} workflow(s) will be ${operation === "cancel" ? "cancelled" : "terminated"}`
            : "Press ⌘P to preview how many workflows match your query"
        }
      />

      {operation === "terminate" && (
        <Form.Description
          title="Warning"
          text="Termination is immediate and cannot be undone. Workflows will not have a chance to clean up."
        />
      )}
    </Form>
  );
}
