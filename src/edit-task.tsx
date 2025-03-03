import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Toast, showToast, Form } from "@raycast/api";
import { getMotionApiClient, Project } from "./api/motion";

// Define task types matching Motion API
interface Task {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  label?: string;
  projectId?: string;
  workspaceId?: string;
}

// Define the same interface as in motion.ts
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
}

interface TaskFormValues {
  name: string;
  description: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  label: string;
  projectId: string;
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load tasks when the component mounts
  useEffect(() => {
    loadTasks();
    loadProjects();
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
      const sortedTasks = [...tasksData].sort((a, b) => {
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

  // Load projects from Motion API
  async function loadProjects() {
    try {
      const motionClient = getMotionApiClient();
      const projectsData = await motionClient.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading projects:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    }
  }

  // Handle task selection for editing
  function handleTaskSelect(taskId: string) {
    setSelectedTaskId(taskId);
    setIsEditing(true);
  }

  // Format priority for display
  function formatPriority(priority?: string): string {
    if (!priority) return "None";

    switch (priority) {
      case "ASAP":
        return "ASAP";
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

  // Format date for display
  function formatDate(dateString?: string): string {
    if (!dateString) return "No due date";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  }

  // Get project name by ID
  function getProjectName(projectId?: string): string {
    if (!projectId) return "None";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "Unknown Project";
  }

  // Task list view
  if (!isEditing) {
    return (
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search tasks by name or description..."
        throttle
      >
        {filteredTasks.length === 0 ? (
          <List.EmptyView
            title={searchText ? "No matching tasks found" : "No tasks found"}
            description={
              searchText ? "Try a different search term" : "Add tasks in Motion or with the Add Task command"
            }
          />
        ) : (
          filteredTasks.map((task) => (
            <List.Item
              key={task.id}
              title={task.name}
              subtitle={task.description}
              accessories={[
                { text: formatPriority(task.priority) },
                { text: formatDate(task.dueDate) },
                { text: task.status || "No Status" },
                { text: getProjectName(task.projectId) },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Edit Task" onAction={() => handleTaskSelect(task.id || "")} />
                  <Action.CopyToClipboard title="Copy Task Details" content={JSON.stringify(task, null, 2)} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  // Task edit form
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  if (!selectedTask) {
    return (
      <List>
        <List.EmptyView title="Task not found" description="The selected task could not be found" />
      </List>
    );
  }

  // Convert due date string to Date object
  let dueDateObj: Date | undefined;
  try {
    dueDateObj = selectedTask.dueDate ? new Date(selectedTask.dueDate) : undefined;
  } catch (e) {
    console.error("Invalid date format:", selectedTask.dueDate);
  }

  async function handleSubmit(values: TaskFormValues) {
    setIsLoading(true);

    try {
      const motionClient = getMotionApiClient();

      if (!selectedTask) {
        throw new Error("No task selected");
      }

      // Get the Motion workspace ID from preferences
      const preferences = getMotionApiClient().getWorkspaceId();

      // Convert Date object to ISO string for API
      const dueDateString = values.dueDate ? values.dueDate.toISOString().split("T")[0] : undefined;

      // Prepare update payload
      const taskUpdate: MotionTask = {
        id: selectedTask.id,
        name: values.name,
        description: values.description,
        dueDate: dueDateString,
        priority: values.priority,
        status: values.status,
        label: values.label || undefined,
        projectId: values.projectId || undefined,
        workspaceId: selectedTask.workspaceId || preferences,
      };

      // Update the task
      await motionClient.updateTask(taskUpdate);

      await showToast({
        style: Toast.Style.Success,
        title: "Task updated",
        message: `"${values.name}" has been updated`,
      });

      // Reload tasks to get the updated list
      await loadTasks();

      // Return to the task list view
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating task:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => setIsEditing(false)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit task details" />
      <Form.TextField id="name" title="Name" placeholder="Task name" defaultValue={selectedTask.name} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Task description"
        defaultValue={selectedTask.description || ""}
      />

      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={dueDateObj} type={Form.DatePicker.Type.Date} />

      <Form.Dropdown id="priority" title="Priority" defaultValue={selectedTask.priority || "MEDIUM"}>
        <Form.Dropdown.Item value="LOW" title="Low" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HIGH" title="High" />
        <Form.Dropdown.Item value="ASAP" title="ASAP" />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Status" defaultValue={selectedTask.status || "TODO"}>
        <Form.Dropdown.Item value="TODO" title="To Do" />
        <Form.Dropdown.Item value="IN_PROGRESS" title="In Progress" />
        <Form.Dropdown.Item value="DONE" title="Done" />
      </Form.Dropdown>

      <Form.Dropdown id="label" title="Label" defaultValue={selectedTask.label || ""}>
        <Form.Dropdown.Item value="" title="None" />
        {["House", "Personal", "St Faith's", "Westside", "Goals", "BAU", "ACA", "Job hunt", "Boys", "Board"].map(
          (label) => (
            <Form.Dropdown.Item key={label} value={label} title={label} />
          ),
        )}
      </Form.Dropdown>

      <Form.Dropdown id="projectId" title="Project" defaultValue={selectedTask.projectId || ""}>
        <Form.Dropdown.Item value="" title="None" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
