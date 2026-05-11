import { useState, useCallback } from "react";
import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClustersFromStorage, addCluster, updateCluster, deleteCluster } from "./lib/storage";
import { ClusterConfig } from "./lib/types";
import { invalidateClustersCache, listNamespaces, setCurrentCluster } from "./lib/temporal-client";

// ============================================================================
// Main List View
// ============================================================================

export default function ManageConnections() {
  const {
    data: clusters,
    isLoading,
    revalidate,
  } = useCachedPromise(getClustersFromStorage, [], {
    keepPreviousData: true,
  });

  const handleRefresh = useCallback(() => {
    invalidateClustersCache();
    revalidate();
  }, [revalidate]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections...">
      {clusters?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Connections"
          description="Add your first Temporal connection to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Connection"
                icon={Icon.Plus}
                target={<AddConnectionForm onSuccess={handleRefresh} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Connections" subtitle={String(clusters?.length || 0)}>
          {clusters?.map((cluster) => (
            <ConnectionListItem key={cluster.name} cluster={cluster} onRefresh={handleRefresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ============================================================================
// Connection List Item
// ============================================================================

interface ConnectionListItemProps {
  cluster: ClusterConfig;
  onRefresh: () => void;
}

function ConnectionListItem({ cluster, onRefresh }: ConnectionListItemProps) {
  const hasApiKey = Boolean(cluster.apiKey);

  return (
    <List.Item
      title={cluster.name}
      subtitle={cluster.url}
      icon={{ source: Icon.Globe, tintColor: Color.Blue }}
      accessories={[
        { text: cluster.namespace, tooltip: `Default namespace: ${cluster.namespace}` },
        hasApiKey ? { icon: Icon.Key, tooltip: "API key configured" } : {},
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Connection">
            <Action.Push
              title="Edit Connection"
              icon={Icon.Pencil}
              target={<EditConnectionForm cluster={cluster} onSuccess={onRefresh} />}
            />
            <Action.Push
              title="Test Connection"
              icon={Icon.Bolt}
              target={<TestConnection cluster={cluster} />}
            />
            <Action
              title="Delete Connection"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Connection",
                  message: `Are you sure you want to delete "${cluster.name}"?`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                });
                if (!confirmed) return;

                const error = await deleteCluster(cluster.name);
                if (error) {
                  await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
                } else {
                  invalidateClustersCache();
                  await showToast({ style: Toast.Style.Success, title: "Connection Deleted" });
                  onRefresh();
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="Add Connection"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddConnectionForm onSuccess={onRefresh} />}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={cluster.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Namespace"
              content={cluster.namespace}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Add Connection Form
// ============================================================================

interface AddConnectionFormProps {
  onSuccess: () => void;
}

function AddConnectionForm({ onSuccess }: AddConnectionFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const handleSubmit = async (values: {
    name: string;
    url: string;
    namespace: string;
    apiKey: string;
  }) => {
    // Validation
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.url.trim()) {
      setUrlError("URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(values.url);
    } catch {
      setUrlError("Invalid URL format");
      return;
    }

    setIsLoading(true);

    const cluster: ClusterConfig = {
      name: values.name.trim(),
      url: values.url.trim().replace(/\/$/, ""), // Remove trailing slash
      namespace: values.namespace.trim() || "default",
      apiKey: values.apiKey.trim() || undefined,
    };

    const error = await addCluster(cluster);

    if (error) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
      return;
    }

    invalidateClustersCache();
    await showToast({
      style: Toast.Style.Success,
      title: "Connection Added",
      message: cluster.name,
    });
    onSuccess();
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Connection"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Connection" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Local Dev, Staging, Production"
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="http://localhost:8080"
        info="Temporal Web UI URL (used for API access)"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />

      <Form.TextField
        id="namespace"
        title="Namespace"
        placeholder="default"
        defaultValue="default"
        info="Default namespace for this connection"
      />

      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Optional - required for Temporal Cloud"
        info="API key for authentication (Temporal Cloud)"
      />

      <Form.Description
        title="Examples"
        text={`
Local Docker: http://localhost:8080
Dev Server: http://localhost:8233
Temporal Cloud: https://cloud.temporal.io
        `.trim()}
      />
    </Form>
  );
}

// ============================================================================
// Edit Connection Form
// ============================================================================

interface EditConnectionFormProps {
  cluster: ClusterConfig;
  onSuccess: () => void;
}

function EditConnectionForm({ cluster, onSuccess }: EditConnectionFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const handleSubmit = async (values: {
    name: string;
    url: string;
    namespace: string;
    apiKey: string;
  }) => {
    // Validation
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.url.trim()) {
      setUrlError("URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(values.url);
    } catch {
      setUrlError("Invalid URL format");
      return;
    }

    setIsLoading(true);

    const updatedCluster: ClusterConfig = {
      name: values.name.trim(),
      url: values.url.trim().replace(/\/$/, ""),
      namespace: values.namespace.trim() || "default",
      apiKey: values.apiKey.trim() || undefined,
    };

    const error = await updateCluster(cluster.name, updatedCluster);

    if (error) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error });
      return;
    }

    invalidateClustersCache();
    await showToast({
      style: Toast.Style.Success,
      title: "Connection Updated",
      message: updatedCluster.name,
    });
    onSuccess();
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit: ${cluster.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={cluster.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />

      <Form.TextField
        id="url"
        title="URL"
        defaultValue={cluster.url}
        info="Temporal Web UI URL (used for API access)"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />

      <Form.TextField
        id="namespace"
        title="Namespace"
        defaultValue={cluster.namespace}
        info="Default namespace for this connection"
      />

      <Form.PasswordField
        id="apiKey"
        title="API Key"
        defaultValue={cluster.apiKey || ""}
        placeholder="Optional - required for Temporal Cloud"
        info="API key for authentication (Temporal Cloud)"
      />
    </Form>
  );
}

// ============================================================================
// Test Connection View
// ============================================================================

interface TestConnectionProps {
  cluster: ClusterConfig;
}

function TestConnection({ cluster }: TestConnectionProps) {
  const { pop } = useNavigation();

  const { data, isLoading, error } = useCachedPromise(
    async (c: ClusterConfig) => {
      // Temporarily set this cluster as current for the test
      setCurrentCluster(c);
      const namespaces = await listNamespaces();
      return { success: true, namespaces };
    },
    [cluster],
    {
      keepPreviousData: false,
    }
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Test: ${cluster.name}`}>
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Connection Failed"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : data ? (
        <>
          <List.Section title="Connection Successful">
            <List.Item
              title="Status"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: "Connected", icon: Icon.CheckCircle }]}
            />
            <List.Item title="URL" icon={Icon.Globe} accessories={[{ text: cluster.url }]} />
          </List.Section>
          <List.Section title={`Namespaces (${data.namespaces.length})`}>
            {data.namespaces.map((ns) => (
              <List.Item
                key={ns.name}
                title={ns.name}
                subtitle={ns.description}
                icon={Icon.Folder}
                accessories={[{ tag: ns.state }]}
              />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
