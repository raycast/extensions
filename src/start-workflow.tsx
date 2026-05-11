import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { startWorkflow, getCurrentNamespace } from "./lib/temporal-client";

const LAST_WORKFLOW_CONFIG_KEY = "lastWorkflowConfig";

interface WorkflowConfig {
  workflowType: string;
  taskQueue: string;
}

export default function StartWorkflow() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [workflowType, setWorkflowType] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [taskQueue, setTaskQueue] = useState("");
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  // Load last used config
  useEffect(() => {
    async function loadLastConfig() {
      const stored = await LocalStorage.getItem<string>(LAST_WORKFLOW_CONFIG_KEY);
      if (stored) {
        try {
          const config = JSON.parse(stored) as WorkflowConfig;
          setWorkflowType(config.workflowType || "");
          setTaskQueue(config.taskQueue || "");
        } catch {
          // Ignore parse errors
        }
      }
    }
    loadLastConfig();
  }, []);

  const validateInput = (value: string) => {
    if (!value.trim()) {
      setInputError(undefined);
      return true;
    }

    try {
      JSON.parse(value);
      setInputError(undefined);
      return true;
    } catch {
      setInputError("Invalid JSON");
      return false;
    }
  };

  const generateWorkflowId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${workflowType.toLowerCase().replace(/\s+/g, "-")}-${timestamp}-${random}`;
  };

  const handleSubmit = async () => {
    if (!workflowType.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Workflow Type Required",
        message: "Please enter a workflow type",
      });
      return;
    }

    if (!taskQueue.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Queue Required",
        message: "Please enter a task queue",
      });
      return;
    }

    if (input.trim() && !validateInput(input)) {
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting workflow...",
      });

      const finalWorkflowId = workflowId.trim() || generateWorkflowId();

      let parsedInput: unknown = undefined;
      if (input.trim()) {
        parsedInput = JSON.parse(input);
      }

      const result = await startWorkflow({
        workflowId: finalWorkflowId,
        workflowType: workflowType.trim(),
        taskQueue: taskQueue.trim(),
        input: parsedInput,
      });

      // Save config for next time
      await LocalStorage.setItem(
        LAST_WORKFLOW_CONFIG_KEY,
        JSON.stringify({
          workflowType: workflowType.trim(),
          taskQueue: taskQueue.trim(),
        })
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Workflow Started",
        message: `ID: ${finalWorkflowId}\nRun: ${result.runId}`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start Workflow",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const namespace = getCurrentNamespace();

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Start Workflow"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Workflow" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Namespace" text={namespace} />

      <Form.Separator />

      <Form.TextField
        id="workflowType"
        title="Workflow Type"
        placeholder="e.g., OrderWorkflow, ProcessPayment"
        value={workflowType}
        onChange={setWorkflowType}
        autoFocus
        info="The name of the workflow to start"
      />

      <Form.TextField
        id="taskQueue"
        title="Task Queue"
        placeholder="e.g., main-queue, orders"
        value={taskQueue}
        onChange={setTaskQueue}
        info="The task queue where workers are listening"
      />

      <Form.TextField
        id="workflowId"
        title="Workflow ID"
        placeholder="Optional - auto-generated if empty"
        value={workflowId}
        onChange={setWorkflowId}
        info="Unique identifier for this workflow execution"
      />

      <Form.TextArea
        id="input"
        title="Input (JSON)"
        placeholder='{"orderId": "123", "amount": 99.99}'
        value={input}
        onChange={(value) => {
          setInput(value);
          if (value.trim()) {
            validateInput(value);
          } else {
            setInputError(undefined);
          }
        }}
        error={inputError}
        info="Optional JSON input for the workflow"
      />
    </Form>
  );
}
