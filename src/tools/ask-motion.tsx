import { getMotionApiClient } from "../api/motion";

export default async function Command(props: { arguments: { question: string } }) {
  try {
    // Get the question from the arguments
    const question = props.arguments.question;

    // Initialize the Motion client and fetch tasks
    const motionClient = getMotionApiClient();
    const tasks = await motionClient.getTasks();

    // Format the tasks data for the AI
    let tasksData = "No tasks found in Motion.";

    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      tasksData = tasks
        .map((task) => {
          return `
Title: ${task.name}
Description: ${task.description || "N/A"}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}
Priority: ${task.priority || "N/A"}
Status: ${task.status || "N/A"}
Label: ${task.label || "N/A"}
          `;
        })
        .join("\n---\n");
    }

    // Return structured data to Raycast AI
    return `
## Motion Task Information

Here's information about your tasks in Motion:

${tasksData}

I've answered your question about "${question}" based on the information above.
`;
  } catch (error) {
    console.error("Error in Ask Motion tool:", error);
    return `
## Error Accessing Motion

I encountered an error while trying to access your Motion data. Please check your Motion API key and workspace ID in the extension preferences, and make sure your internet connection is working.

Error details: ${String(error)}
`;
  }
}
