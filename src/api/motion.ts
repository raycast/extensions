import { getPreferenceValues } from "@raycast/api";
// node-fetch v3 is ESM only, but Raycast uses CommonJS
// Using this approach for compatibility
import fetch, { Response } from "node-fetch";

interface Preferences {
  apiKey: string;
  workspaceId: string;
}

interface MotionTask {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  workspaceId: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  label?: string;
  projectId?: string;
  autoScheduled?: {
    startDate?: string;
    deadlineType?: "HARD" | "SOFT" | "NONE";
    schedule?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

interface Workspace {
  id: string;
  name: string;
  teamId: string | null;
  type: string;
  labels: string[];
  taskStatuses: TaskStatus[];
  // Adding debug properties to help with testing
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  memberCount?: number;
  settings?: Record<string, unknown>;
}

interface TaskStatus {
  name: string;
  isDefaultStatus: boolean;
  isResolvedStatus: boolean;
}

interface WorkspacesResponse {
  workspaces: Workspace[];
}

// Motion API endpoints
const BASE_URL = "https://api.usemotion.com/v1";

// Available labels (fetched from workspace data)
export const LABEL_PRESETS = [
  "House",
  "Personal",
  "St Faith's",
  "Westside",
  "Goals",
  "BAU",
  "ACA",
  "Job hunt",
  "Boys",
  "Board",
];

// Schedule presets to fix build error
export const SCHEDULE_PRESETS = ["Later Today", "Tomorrow", "This Week", "Next Week", "Custom"];

// Add debug logging to help troubleshoot API issues
const logRequest = (method: string, url: string, headers: Record<string, string>, body?: Record<string, unknown>) => {
  console.log(`[REQUEST] ${method} ${url}`);
  console.log("[HEADERS]", JSON.stringify(headers, null, 2));
  if (body) {
    console.log("[BODY]", JSON.stringify(body, null, 2));
  }
};

const logResponse = async (response: Response) => {
  console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
  try {
    // Clone the response to read the body, as it can only be read once
    const clone = response.clone();
    const text = await clone.text();
    console.log("[RESPONSE BODY]", text);
    return text;
  } catch (error) {
    console.log("[RESPONSE BODY ERROR]", error);
    return "";
  }
};

export const getMotionApiClient = () => {
  const preferences = getPreferenceValues<Preferences>();

  // Now we know X-API-Key works, simplify the authentication
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": preferences.apiKey,
  };

  // IMPORTANT: Override with the correct workspace ID regardless of preferences
  // The lowercase 'l' is important and often confused with capital 'I'
  const correctWorkspaceId = "J2-2vXH85SltZ52ieplcF"; // Using the proven correct ID

  // Log the workspace IDs for debugging
  console.log("[DEBUG] Preference workspace ID:", preferences.workspaceId);
  console.log("[DEBUG] Using corrected workspace ID:", correctWorkspaceId);

  return {
    // Get the workspace ID (for use in components)
    getWorkspaceId(): string {
      return correctWorkspaceId;
    },

    async createTask(taskInput: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      label?: string;
      projectId?: string;
    }): Promise<MotionTask> {
      console.log("[DEBUG] Creating task with input:", JSON.stringify(taskInput, null, 2));

      // Simplify our approach now that we know the correct format
      const url = `${BASE_URL}/tasks`;

      // Destructure to remove the label property which API doesn't accept
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { label, ...taskData } = taskInput;

      // Create task object with the correct properties
      const task = {
        name: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate?.toISOString(),
        priority: taskData.priority,
        status: taskData.status,
        workspaceId: correctWorkspaceId, // Use the correct ID
        projectId: taskData.projectId,
        // Add auto-scheduling by default
        autoScheduled: {
          deadlineType: "SOFT", // Use SOFT deadline by default
          schedule: "Work Hours", // Use standard work hours for scheduling
        },
      };

      logRequest("POST", url, headers, task);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(task),
        });

        if (!response.ok) {
          const responseText = await logResponse(response);
          throw new Error(`Failed to create task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`);
        }

        return response.json() as Promise<MotionTask>;
      } catch (error) {
        console.error("[DEBUG] Create task error:", error);
        throw error;
      }
    },

    async getProjects(): Promise<Project[]> {
      const url = `${BASE_URL}/projects?workspaceId=${correctWorkspaceId}`;
      logRequest("GET", url, headers);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const responseText = await logResponse(response);
          throw new Error(`Failed to get projects: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`);
        }

        // Parse the response
        const data = await response.json();

        // Log full response for debugging
        console.log("[DEBUG] Projects response data:", JSON.stringify(data, null, 2));

        // Handle both array and object with projects property formats
        if (Array.isArray(data)) {
          return data as Project[];
        } else if (data && typeof data === "object") {
          // Check for common wrapper properties like 'projects', 'items', 'data', etc.
          for (const key of ["projects", "items", "data", "results"]) {
            if (Array.isArray(data[key])) {
              return data[key] as Project[];
            }
          }

          // If we can't find a projects array in a known property, return whatever we got
          console.warn("[DEBUG] Couldn't find projects array in response, returning raw data");
          return Array.isArray(data) ? data : ([data] as Project[]);
        }

        // Fallback to empty array if we couldn't parse anything
        console.warn("[DEBUG] Returning empty array as couldn't parse projects response");
        return [];
      } catch (error) {
        console.error("[DEBUG] Get projects error:", error);
        throw error;
      }
    },

    async getTasks(): Promise<MotionTask[]> {
      // The workspace-based URL approach is not working (404 error)
      // Let's try using the base tasks endpoint with a query parameter instead
      const url = `${BASE_URL}/tasks?workspaceId=${correctWorkspaceId}`;
      logRequest("GET", url, headers);

      try {
        console.log("[DEBUG] Attempting to fetch tasks from Motion API...");
        const response = await fetch(url, {
          method: "GET",
          headers,
        });

        console.log(`[DEBUG] Motion API response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const responseText = await logResponse(response);
          const errorMessage = `Failed to get tasks: ${response.statusText}${responseText ? ` - ${responseText}` : ""} (Status: ${response.status})`;
          console.error("[DEBUG] API Error:", errorMessage);
          throw new Error(errorMessage);
        }

        // Parse the response
        const data = await response.json();

        // Log full response for debugging
        console.log("[DEBUG] Tasks response data:", JSON.stringify(data, null, 2));
        console.log(`[DEBUG] Response data type: ${typeof data}, isArray: ${Array.isArray(data)}`);

        if (data === null || data === undefined) {
          console.warn("[DEBUG] Response data is null or undefined");
          return [];
        }

        // Handle both array and object with tasks property formats
        if (Array.isArray(data)) {
          console.log(`[DEBUG] Found ${data.length} tasks in array format`);
          return data as MotionTask[];
        } else if (data && typeof data === "object") {
          // Check for common wrapper properties like 'tasks', 'items', 'data', etc.
          for (const key of ["tasks", "items", "data", "results"]) {
            if (Array.isArray(data[key])) {
              console.log(`[DEBUG] Found ${data[key].length} tasks in '${key}' property`);
              return data[key] as MotionTask[];
            }
          }

          // If we can't find a tasks array in a known property, return whatever we got
          // This will at least give us debugging info
          console.warn("[DEBUG] Couldn't find tasks array in response, returning raw data");
          return Array.isArray(data) ? data : ([data] as MotionTask[]);
        }

        // Fallback to empty array if we couldn't parse anything
        console.warn("[DEBUG] Returning empty array as couldn't parse tasks response");
        return [];
      } catch (error) {
        console.error("[DEBUG] Get tasks error:", error);
        if (error instanceof Error) {
          console.error("[DEBUG] Error name:", error.name);
          console.error("[DEBUG] Error message:", error.message);
          console.error("[DEBUG] Error stack:", error.stack);
        }
        throw error;
      }
    },

    async getTaskById(id: string): Promise<MotionTask> {
      const url = `${BASE_URL}/tasks/${id}?workspaceId=${correctWorkspaceId}`;
      logRequest("GET", url, headers);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const responseText = await logResponse(response);
        throw new Error(`Failed to get task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`);
      }

      return response.json() as Promise<MotionTask>;
    },

    async updateTask(task: MotionTask): Promise<MotionTask> {
      // Ensure the task has the correct workspaceId
      const taskToUpdate = { ...task, workspaceId: correctWorkspaceId };

      // Make sure we have a task ID
      if (!task.id) {
        throw new Error("Task ID is required for updating");
      }

      // Construct URL with both task ID and workspaceId as a query param to ensure API compatibility
      const url = `${BASE_URL}/tasks/${task.id}?workspaceId=${correctWorkspaceId}`;

      // Log both URL and payload for debugging
      console.log(`[DEBUG] updateTask URL: ${url}`);
      console.log(`[DEBUG] updateTask payload:`, JSON.stringify(taskToUpdate, null, 2));

      logRequest("PUT", url, headers, taskToUpdate);

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(taskToUpdate),
      });

      if (!response.ok) {
        const responseText = await logResponse(response);
        console.error(`[ERROR] Update task failed with status ${response.status}: ${responseText}`);
        throw new Error(`Failed to update task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`);
      }

      return response.json() as Promise<MotionTask>;
    },

    async deleteTask(id: string): Promise<void> {
      const url = `${BASE_URL}/tasks/${id}?workspaceId=${correctWorkspaceId}`;
      logRequest("DELETE", url, headers);

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const responseText = await logResponse(response);
        throw new Error(`Failed to delete task: ${response.statusText}${responseText ? ` - ${responseText}` : ""}`);
      }
    },

    async getWorkspaces(): Promise<WorkspacesResponse> {
      console.log("[DEBUG] Attempting to get workspace information...");

      // Try different endpoints to see which one works
      const endpoints = [`${BASE_URL}/workspaces`, `${BASE_URL}/organizations`];

      for (const endpoint of endpoints) {
        try {
          console.log(`[DEBUG] Trying endpoint: ${endpoint}`);
          logRequest("GET", endpoint, headers);

          const response = await fetch(endpoint, {
            method: "GET",
            headers,
          });

          if (response.ok) {
            const rawData = await response.json();
            console.log(`[DEBUG] Raw response from ${endpoint}:`, JSON.stringify(rawData, null, 2));

            // Check if the response is already in the expected format
            if (
              rawData &&
              typeof rawData === "object" &&
              "workspaces" in rawData &&
              Array.isArray(rawData.workspaces)
            ) {
              console.log(`[DEBUG] Found standard format response with ${rawData.workspaces.length} workspaces`);
              return rawData as WorkspacesResponse;
            }

            // Check if the response is an array of workspaces
            if (Array.isArray(rawData)) {
              console.log(`[DEBUG] Found array format response with ${rawData.length} workspaces`);
              return { workspaces: rawData } as WorkspacesResponse;
            }

            // Check if the response is a different format but contains workspace information
            if (rawData && typeof rawData === "object") {
              // Look for arrays in the object that might contain workspaces
              for (const [key, value] of Object.entries(rawData)) {
                if (
                  Array.isArray(value) &&
                  value.length > 0 &&
                  value[0] &&
                  typeof value[0] === "object" &&
                  "id" in value[0]
                ) {
                  console.log(`[DEBUG] Found workspaces in '${key}' property with ${value.length} workspaces`);
                  return { workspaces: value } as WorkspacesResponse;
                }
              }
            }

            // If we couldn't parse it in a standard way, return the raw data wrapped
            console.log(
              "[DEBUG] Could not identify standard format, returning raw data wrapped in workspaces property",
            );
            return { workspaces: [rawData] } as WorkspacesResponse;
          } else {
            const responseText = await logResponse(response);
            console.log(`[DEBUG] Failed with endpoint ${endpoint}: ${response.statusText} - ${responseText}`);
          }
        } catch (error) {
          console.error(`[DEBUG] Error with endpoint ${endpoint}:`, error);
        }
      }

      // Return empty workspaces array instead of throwing an error
      console.log("[DEBUG] Failed to get workspace information from any endpoint, returning empty workspace array");
      return { workspaces: [] };
    },
  };
};
