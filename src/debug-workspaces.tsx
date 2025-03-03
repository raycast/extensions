import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Toast, showToast } from "@raycast/api";
import { getMotionApiClient } from "./api/motion";

// Define workspace interface to avoid using 'any'
interface Workspace {
  id: string;
  name: string;
  type: string;
  teamId: string | null;
  labels: string[];
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const motionClient = getMotionApiClient();
        const data = await motionClient.getWorkspaces();

        // Handle the API response structure correctly
        // The API returns { workspaces: [...] } rather than the array directly
        if (data.workspaces && Array.isArray(data.workspaces)) {
          setWorkspaces(data.workspaces);
        } else {
          console.error("Unexpected workspaces data format:", data);
          setError("Unexpected data format from API");
        }
      } catch (err) {
        console.error("Error fetching workspaces:", err);
        setError(String(err));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch workspaces",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces...">
      <List.Section title="Your Motion Workspaces" subtitle="Find your workspace ID here">
        {error ? (
          <List.EmptyView title="Error fetching workspaces" description={error} />
        ) : workspaces.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No workspaces found"
            description="Make sure your API key is correct and you have access to at least one workspace."
          />
        ) : (
          workspaces.map((workspace) => (
            <List.Item
              key={workspace.id}
              title={workspace.name || "Unnamed Workspace"}
              subtitle={`ID: ${workspace.id}`}
              accessories={[
                {
                  text: workspace.type || "Unknown Type",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Workspace Id"
                    content={workspace.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Workspace Details"
                    content={JSON.stringify(workspace, null, 2)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
