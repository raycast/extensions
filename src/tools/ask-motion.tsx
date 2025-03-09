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

    // Extract more useful information from the error
    const errorDetails = String(error);
    let troubleshootingSteps = "";

    // Add specific troubleshooting steps based on error message
    if (errorDetails.includes("Failed to get tasks")) {
      troubleshootingSteps = `
Troubleshooting steps:
1. Verify your Motion API key is correct in Raycast preferences
2. Check that your specified workspace ID exists and is accessible
3. Try running the 'Debug Workspaces' command to verify connectivity
4. Ensure you have tasks in your Motion workspace
`;
    } else if (errorDetails.includes("fetch failed") || errorDetails.includes("network")) {
      troubleshootingSteps = `
Troubleshooting steps:
1. Check your internet connection
2. Verify that motion.usemotion.com is accessible from your browser
3. Check if there's a Motion service outage
`;
    } else {
      troubleshootingSteps = `
Troubleshooting steps:
1. Verify your Motion API key is correct in Raycast preferences
2. Check that your workspace ID exists and is accessible
3. Try running the 'Debug Workspaces' command to verify connectivity
4. Contact the extension developer with the error details below
`;
    }

    return `
## Error Accessing Motion

I encountered an error while trying to access your Motion data. 

${troubleshootingSteps}

Error details: ${errorDetails}
`;
  }
}
