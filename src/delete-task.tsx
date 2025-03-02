import { ActionPanel, Action, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMotionApiClient } from "./api/motion";

interface Task {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status?: string;
  label?: string;
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Load tasks when the component mounts
  useEffect(() => {
    loadTasks();
  }, []);

  // Filter tasks based on search text
  useEffect(() => {
    if (!searchText) {
      setFilteredTasks(tasks);
      return;
    }

    const filtered = tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchText.toLowerCase())),
    );

    setFilteredTasks(filtered);
  }, [tasks, searchText]);

  // Load tasks from Motion API
  async function loadTasks() {
    setIsLoading(true);

    try {
      const motionClient = getMotionApiClient();
      const tasksData = await motionClient.getTasks();

      // Sort tasks by due date (most recent first)
      const sortedTasks = tasksData.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Delete a task
  async function deleteTask(taskId?: string) {
    if (!taskId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete task",
        message: "Task ID is missing",
      });
      return;
    }

    try {
      setIsLoading(true);
      const motionClient = getMotionApiClient();

      // Ask for confirmation before deleting
      const confirmed = await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task? This action cannot be undone.",
        primaryAction: {
          title: "Delete",
        },
      });

      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      await motionClient.deleteTask(taskId);

      // Remove the deleted task from the list
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

      await showToast({
        style: Toast.Style.Success,
        title: "Task deleted",
        message: "The task has been removed from Motion",
      });
    } catch (error) {
      console.error("Error deleting task:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Format the due date
  function formatDueDate(dateString?: string) {
    if (!dateString) return "No due date";

    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    if (dueDay.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDay.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return dueDate.toLocaleDateString();
    }
  }

  // Get color for priority
  function getPriorityColor(priority?: string) {
    switch (priority) {
      case "URGENT":
        return "#FF5252";
      case "HIGH":
        return "#FFA000";
      case "MEDIUM":
        return "#4CAF50";
      case "LOW":
        return "#2196F3";
      default:
        return "#757575";
    }
  }

  // Safely get task status as string
  function getTaskStatus(status?: string): string {
    return status ? String(status) : "No Status";
  }

  // Safely get task priority as string with proper capitalization
  function getTaskPriority(priority?: string): string {
    if (!priority) return "No Priority";

    // Convert "HIGH" to "High", "MEDIUM" to "Medium", etc.
    switch (priority) {
      case "URGENT":
        return "Urgent";
      case "HIGH":
        return "High";
      case "MEDIUM":
        return "Medium";
      case "LOW":
        return "Low";
      default:
        return String(priority);
    }
  }

  // Safely get task label as string, or empty array if it's an object
  function getTaskLabels(label: string | string[] | null | undefined): string[] {
    // If it's not defined, return empty array
    if (!label) return [];

    // If it's a simple string, return as an array with one item
    if (typeof label === "string") return [label];

    // If it's an array of strings, return it
    if (Array.isArray(label) && label.every((item) => typeof item === "string")) {
      return label;
    }

    // Default case, return empty array
    return [];
  }

  // Safe HTML remover
  function removeHtml(text?: string): string {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, "");
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      throttle
    >
      <List.Section title="Tasks" subtitle={filteredTasks.length.toString()}>
        {filteredTasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.name}
            subtitle={removeHtml(task.description)}
            accessories={[
              {
                tag: {
                  value: getTaskStatus(task.status),
                  color: task.status === "DONE" ? "#4CAF50" : undefined,
                },
              },
              ...(task.dueDate
                ? [
                    {
                      tag: {
                        value: formatDueDate(task.dueDate),
                        color: undefined,
                      },
                    },
                  ]
                : []),
              ...(task.priority
                ? [
                    {
                      tag: {
                        value: getTaskPriority(task.priority),
                        color: getPriorityColor(task.priority),
                      },
                    },
                  ]
                : []),
              // Map each label to a tag, but only if we have valid string labels
              ...getTaskLabels(task.label).map((label) => ({
                tag: { value: label },
              })),
            ]}
            actions={
              <ActionPanel>
                <Action title="Delete Task" onAction={() => deleteTask(task.id)} />
                <Action title="Refresh Tasks" onAction={loadTasks} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
