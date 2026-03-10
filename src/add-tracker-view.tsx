import { Action, ActionPanel, Form, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { clearApiKey, getApiKey, setApiKey, setTrackedProject } from "./storage";
import { listProjects, VercelProject } from "./vercel";

type ApiKeyFormValues = {
  apiKey: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

export default function AddTrackerView() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedApiKey = await getApiKey();
      if (!storedApiKey) {
        return;
      }

      if (!isMounted) {
        return;
      }

      setApiKeyState(storedApiKey);
      await fetchProjects(storedApiKey);
    }

    bootstrap().catch(async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to initialize command",
        message: getErrorMessage(error),
      });
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Safety net so this command never appears to load forever.
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setStatusMessage((current) => current ?? "Timed out while loading projects");
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  async function fetchProjects(resolvedApiKey: string) {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const loadedProjects = await listProjects(resolvedApiKey);
      setProjects(loadedProjects);
      if (loadedProjects.length === 0) {
        setStatusMessage("No projects found for this account");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load projects",
        message: getErrorMessage(error),
      });
      await clearApiKey();
      setApiKeyState(null);
      setStatusMessage("Could not load projects with saved API key");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitApiKey(values: ApiKeyFormValues) {
    const trimmedValue = values.apiKey.trim();
    if (!trimmedValue) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key is required",
      });
      return;
    }

    setIsSubmittingKey(true);
    setStatusMessage(null);

    try {
      const loadedProjects = await listProjects(trimmedValue);
      await setApiKey(trimmedValue);
      setApiKeyState(trimmedValue);
      setProjects(loadedProjects);
      setApiKeyInput("");
      if (loadedProjects.length === 0) {
        setStatusMessage("API key is valid, but no projects were returned");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Vercel API key saved",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid API key",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmittingKey(false);
      setIsLoading(false);
    }
  }

  async function resetApiKey() {
    await clearApiKey();
    setApiKeyState(null);
    setProjects([]);
    setStatusMessage(null);

    await showToast({
      style: Toast.Style.Success,
      title: "API key removed",
    });
  }

  async function selectProject(project: VercelProject) {
    await setTrackedProject(project);

    await showToast({
      style: Toast.Style.Success,
      title: "Tracker added",
      message: `Now tracking ${project.name}`,
    });
  }

  if (!apiKey) {
    return (
      <Form
        isLoading={isSubmittingKey}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save API Key" onSubmit={submitApiKey} />
          </ActionPanel>
        }
      >
        <Form.PasswordField
          id="apiKey"
          title="Vercel API Key"
          placeholder="Paste your Vercel API key"
          value={apiKeyInput}
          onChange={setApiKeyInput}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a Vercel project to track">
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.id}
          actions={
            <ActionPanel>
              <Action title="Track Project" onAction={() => selectProject(project)} />
              <Action title="Reload Projects" onAction={() => fetchProjects(apiKey)} />
              <Action title="Use Different API Key" onAction={resetApiKey} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && projects.length === 0 ? (
        <List.EmptyView
          title="No projects found"
          description={statusMessage ?? "Verify your API key and project access in Vercel."}
        />
      ) : null}
    </List>
  );
}
