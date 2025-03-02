import { Form, ActionPanel, Action, showToast, Toast, List, Icon, Clipboard } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getMotionApiClient } from "./api/motion";

// Define types for our conversation
interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tasksData, setTasksData] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load Motion task data to provide context to the AI
  async function loadMotionData() {
    if (tasksData) return; // Only load once if we already have data

    setIsLoadingTasks(true);
    try {
      const motionClient = getMotionApiClient();
      const tasks = await motionClient.getTasks();

      // Check if tasks is an array and not empty
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        console.log("[DEBUG] No tasks found or tasks is not an array:", tasks);
        setTasksData("No tasks found in Motion.");
        return;
      }

      // Format tasks data for AI context
      const formattedTasks = tasks
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

      setTasksData(formattedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
      setTasksData("Error loading tasks data");
    } finally {
      setIsLoadingTasks(false);
    }
  }

  // Submit new query to AI
  function handleSubmit(values: { query: string }) {
    const userQuery = values.query;
    setQuery(userQuery);

    // Add user message to conversation
    setConversation((prev) => [...prev, { role: "user", content: userQuery }]);

    if (isInitialLoad) {
      loadMotionData();
      setIsInitialLoad(false);
    }

    setIsSubmitted(true);
  }

  // Handle follow-up questions
  function handleFollowUp(followUpQuery: string) {
    setQuery(followUpQuery);

    // Add follow-up question to conversation
    setConversation((prev) => [...prev, { role: "user", content: followUpQuery }]);
  }

  // Generate AI prompt with conversation history and Motion tasks context
  const generatePrompt = () => {
    // Initial system context
    let prompt = `You are an AI assistant for the Motion app, a task and productivity tool.
    
The user has the following tasks in their Motion account:

${tasksData || "Loading tasks..."}

`;

    // Add conversation history
    if (conversation.length > 0) {
      prompt += "\nConversation history:\n";
      conversation.forEach((message) => {
        prompt += `${message.role === "user" ? "User" : "Assistant"}: ${message.content}\n`;
      });
    }

    // Add the current query
    prompt += `\nBased on the above context, please answer this question: ${query}`;

    return prompt;
  };

  // Only call useAI after form submission with appropriate context
  const { isLoading: aiLoading } = useAI(isSubmitted ? generatePrompt() : "", {
    execute: isSubmitted && !isLoadingTasks && !!tasksData,
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "AI Error",
        message: String(error),
      });
    },
    onData: (data) => {
      if (data && !conversation.some((msg) => msg.role === "assistant" && msg.content === data)) {
        // Add AI response to conversation if it's not already there
        setConversation((prev) => {
          // Check if the last message is from the assistant
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            // Replace the last message
            return [...prev.slice(0, -1), { role: "assistant", content: data }];
          } else {
            // Add a new message
            return [...prev, { role: "assistant", content: data }];
          }
        });
      }
    },
  });

  // Initialize the application
  useEffect(() => {
    // We don't need to store workspaces or errors in this component,
    // just need to mark loading as complete when initialization is done
    async function initialize() {
      try {
        const motionClient = getMotionApiClient();
        await motionClient.getWorkspaces();
      } catch (err) {
        console.error("Error initializing:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Form view for entering the query
  if (!isSubmitted) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description text="Ask AI about your Motion tasks and schedule" />
        <Form.TextField id="query" title="Question" placeholder="When are my upcoming deadlines?" />
      </Form>
    );
  }

  // Chat view for showing conversation
  return (
    <List
      isLoading={aiLoading || isLoadingTasks || isLoading}
      searchBarPlaceholder="Ask a follow-up question..."
      onSearchTextChange={(text) => {
        if (text.length > 0) {
          setQuery(text);
        }
      }}
      actions={
        <ActionPanel>
          <Action
            title="Send"
            icon={Icon.Envelope}
            onAction={() => {
              if (query.trim().length > 0) {
                handleFollowUp(query);
              }
            }}
          />
          <Action
            title="Start New Conversation"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              setConversation([]);
              setIsSubmitted(false);
              setIsInitialLoad(true);
              setQuery("");
            }}
          />
        </ActionPanel>
      }
    >
      {conversation.map((message, index) => (
        <List.Item
          key={index}
          icon={message.role === "user" ? Icon.Person : Icon.Terminal}
          title={message.role === "user" ? "You" : "Motion AI"}
          detail={
            <List.Item.Detail
              markdown={message.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Role" text={message.role === "user" ? "User" : "Assistant"} />
                  {message.role === "assistant" && (
                    <List.Item.Detail.Metadata.TagList title="Actions">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Copy"
                        onAction={() => {
                          Clipboard.copy(message.content);
                          showToast({ title: "Copied to clipboard" });
                        }}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {message.role === "assistant" && (
                <Action
                  title="Copy Response"
                  icon={Icon.CopyClipboard}
                  onAction={() => {
                    Clipboard.copy(message.content);
                    showToast({ title: "Copied to clipboard" });
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      {aiLoading && (
        <List.Item
          icon={Icon.Terminal}
          title="Motion AI is thinking..."
          detail={<List.Item.Detail markdown="*Generating response...*" />}
        />
      )}
    </List>
  );
}
