import { ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMotionApiClient } from "./api/motion";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("Loading debug information...");
  const [error, setError] = useState<string | null>(null);

  // Define the loadDebugInfo function outside useEffect so it can be reused
  async function loadDebugInfo() {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo("Loading debug information...");

      const motionClient = getMotionApiClient();

      let infoText = "# Motion Debug Information\n\n";

      // Test API key and workspace ID
      infoText += "## API Configuration\n";
      infoText += "Testing API key and workspace ID configuration...\n\n";

      // Test workspace endpoint
      try {
        infoText += "## Workspaces Test\n";
        infoText += "Attempting to fetch workspaces...\n\n";

        const workspacesResponse = await motionClient.getWorkspaces();

        // Log the raw response for debugging
        console.log("[DEBUG] Workspaces response:", JSON.stringify(workspacesResponse, null, 2));

        // Extract workspaces array from the response
        const workspaces = workspacesResponse.workspaces || [];

        if (workspaces && Array.isArray(workspaces) && workspaces.length > 0) {
          infoText += "✅ Successfully retrieved workspaces\n\n";
          infoText += `Found ${workspaces.length} workspace(s):\n\n`;

          workspaces.forEach((workspace, index) => {
            infoText += `### Workspace ${index + 1}\n`;
            infoText += `- ID: \`${workspace.id}\`\n`;
            infoText += `- Name: ${workspace.name}\n`;
            infoText += `- Type: ${workspace.type}\n`;
            if (workspace.labels && Array.isArray(workspace.labels)) {
              infoText += `- Labels: ${workspace.labels.join(", ")}\n`;
            }
            infoText += "\n";
          });
        } else {
          infoText += "⚠️ No workspaces found\n\n";

          // Add more detailed debugging information
          infoText += "**Debug Information:**\n\n";
          infoText += "```\n";
          infoText += `Response type: ${typeof workspacesResponse}\n`;
          infoText += `Has workspaces property: ${workspacesResponse && "workspaces" in workspacesResponse}\n`;

          if (workspacesResponse) {
            infoText += "Response keys: " + Object.keys(workspacesResponse).join(", ") + "\n";

            if ("workspaces" in workspacesResponse) {
              infoText += `Workspaces type: ${typeof workspacesResponse.workspaces}\n`;
              infoText += `Is array: ${Array.isArray(workspacesResponse.workspaces)}\n`;

              if (Array.isArray(workspacesResponse.workspaces)) {
                infoText += `Array length: ${workspacesResponse.workspaces.length}\n`;
              }
            }
          }

          infoText += "Raw response: " + JSON.stringify(workspacesResponse, null, 2) + "\n";
          infoText += "```\n\n";

          infoText +=
            "This may be normal if you don't have any workspaces, or it could indicate an issue with the API response format.\n\n";
        }
      } catch (workspacesError) {
        infoText += `❌ Error fetching workspaces: ${String(workspacesError)}\n\n`;
      }

      // Test tasks endpoint
      try {
        infoText += "## Tasks Test\n";
        infoText += "Attempting to fetch tasks...\n\n";

        const tasks = await motionClient.getTasks();

        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
          infoText += "✅ Successfully retrieved tasks\n\n";
          infoText += `Found ${tasks.length} task(s):\n\n`;

          // Show first 5 tasks as a sample
          const sampleTasks = tasks.slice(0, 5);
          sampleTasks.forEach((task, index) => {
            infoText += `### Task ${index + 1}\n`;
            infoText += `- ID: \`${task.id}\`\n`;
            infoText += `- Name: ${task.name}\n`;
            infoText += `- Status: ${task.status || "N/A"}\n`;
            infoText += `- Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}\n`;
            infoText += "\n";
          });

          if (tasks.length > 5) {
            infoText += `... and ${tasks.length - 5} more task(s)\n\n`;
          }
        } else {
          infoText += "⚠️ No tasks found (this may be normal if you don't have any tasks)\n\n";
        }
      } catch (tasksError) {
        infoText += `❌ Error fetching tasks: ${String(tasksError)}\n\n`;
      }

      infoText += "## Connection Summary\n";
      infoText += "The debug information above can help diagnose any issues with your Motion connection.\n\n";
      infoText += "If you're seeing error messages, please check:\n";
      infoText += "1. Your API key is correct in the extension preferences\n";
      infoText += "2. Your workspace ID is correct (or let the extension auto-detect it)\n";
      infoText += "3. You have an active internet connection\n";
      infoText += "4. The Motion API service is available\n";

      setDebugInfo(infoText);
    } catch (e) {
      console.error("Debug error:", e);
      setError(`Failed to load debug information: ${String(e)}`);

      await showToast({
        style: Toast.Style.Failure,
        title: "Debug Error",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const markdown = error ? `# Error\n\n${error}` : debugInfo;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Debug Info" content={markdown} />
          <Action
            title="Refresh"
            onAction={() => {
              const motionClient = getMotionApiClient();
              Promise.all([
                motionClient.getWorkspaces().catch((e) => `Error: ${e}`),
                motionClient.getTasks().catch((e) => `Error: ${e}`),
              ])
                .then(() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Refreshed",
                    message: "Debug information refreshed",
                  });
                  // Run the debug info loader again
                  loadDebugInfo();
                })
                .catch((error) => {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Refresh Failed",
                    message: String(error),
                  });
                  setIsLoading(false);
                });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
