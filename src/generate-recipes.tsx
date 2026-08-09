import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  LocalStorage,
  confirmAlert,
  Alert,
  open,
  Keyboard,
} from "@raycast/api";
import { authorize, getAccessToken, logout } from "./oauth";

type Values = {
  recipeIdea: string;
  dietaryRequirements: string[];
  customDietary: string;
  cookingStyle: string;
};

type Preferences = {
  apiProvider: "gemini" | "chatgpt" | "claude" | "custom";
  apiKey: string;
  customEndpoint?: string;
  customModel?: string;
  defaultCookingStyle?: "Gourmet" | "Quick & Easy" | "Traditional" | "Experimental";
  defaultDietaryRequirements?:
    | "None"
    | "Vegan"
    | "Vegetarian"
    | "Gluten-Free"
    | "Dairy-Free"
    | "Nut-Free"
    | "Kosher"
    | "Halal"
    | "Low-Sodium"
    | "Sugar-Free"
    | "Pescatarian"
    | "Paleo"
    | "Keto";
};

const DIETARY_REQUIREMENTS = [
  "None",
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Kosher",
  "Halal",
  "Low-Sodium",
  "Sugar-Free",
  "Pescatarian",
  "Paleo",
  "Keto",
  "Custom",
];

const COOKING_STYLES = ["Gourmet", "Quick & Easy", "Traditional", "Experimental"];

const API_ENDPOINTS: Record<string, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  chatgpt: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
};

export default function Command() {
  const [recipe, setRecipe] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dietaryRequirements, setDietaryRequirements] = useState<string[]>(["None"]);
  const [logs, setLogs] = useState<string>("");
  const [checklist, setChecklist] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [skipAuth, setSkipAuth] = useState(false);
  const [showAuthenticatedView, setShowAuthenticatedView] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [forceAuthScreen, setForceAuthScreen] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Detect platform for keyboard shortcuts
  const isMac = process.platform === "darwin";
  const keyboardShortcut = isMac ? "⌘ + ↵" : "Ctrl + ↵";

  const preferences = getPreferenceValues<Preferences>();

  // Check for existing authentication on component mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAccessToken();
        console.log("Auth check - token found:", !!token);
        if (token) {
          console.log("Setting isAuthenticated to true");
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log("No existing authentication found:", error);
      }

      // Load skipAuth preference from LocalStorage
      const savedSkipAuth = await LocalStorage.getItem("cookery_skip_auth");
      console.log("Skip auth preference:", savedSkipAuth);
      if (savedSkipAuth === "true") {
        setSkipAuth(true);
      }

      setAuthChecked(true);
      console.log("Auth check complete - isAuthenticated:", isAuthenticated);
    }
    checkAuth();
  }, []);

  function addLog(message: string) {
    setLogs((prev) => prev + `[${new Date().toISOString()}] ${message}\n`);
  }

  function addChecklistItem(text: string) {
    const id = Date.now().toString();
    setChecklist((prev) => [...prev, { id, text, completed: false }]);
    return id;
  }

  function completeChecklistItem(id: string) {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, completed: true } : item)));
  }

  async function handleLogin() {
    try {
      console.log("Starting login process...");
      await authorize();
      const token = await getAccessToken();
      console.log("Token retrieved:", !!token);
      setIsAuthenticated(!!token);
      setJustLoggedIn(true);
      setShowAuthenticatedView(true);
      // Clear skipAuth preference when user successfully signs in
      await LocalStorage.removeItem("cookery_skip_auth");
      showToast({
        style: Toast.Style.Success,
        title: "Logged in with GitHub",
      });
    } catch (error) {
      console.error("Login failed:");
      console.error("Error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSignout() {
    try {
      console.log("Starting signout process...");
      await logout();
      console.log("Logout completed, setting isAuthenticated to false");
      setIsAuthenticated(false);
      setShowAuthenticatedView(true);
      setForceAuthScreen(true);
      // Also clear the skipAuth preference so they see auth screen again
      await LocalStorage.removeItem("cookery_skip_auth");
      console.log("Signout complete");
      showToast({
        style: Toast.Style.Success,
        title: "Signed out",
      });
    } catch (error) {
      console.error("Signout failed:");
      console.error("Error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Signout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSubmit(values: Values) {
    setLogs("");
    setChecklist([]);
    setShowLogs(false);
    addLog("Starting recipe generation");
    addLog(`API Provider: ${preferences.apiProvider}`);
    addLog(`Recipe Idea: ${values.recipeIdea}`);
    addLog(`Dietary Requirements: ${values.dietaryRequirements.join(", ")}`);
    addLog(`Cooking Style: ${values.cookingStyle}`);

    const validateId = addChecklistItem("Validating configuration...");
    if (!preferences.apiKey) {
      setError("API key is required. Please configure it in preferences.");
      addLog("ERROR: API key is missing");
      return;
    }

    if (!preferences.apiProvider) {
      setError("API provider is required. Please configure it in preferences.");
      addLog("ERROR: API provider is missing");
      return;
    }

    if (!values.recipeIdea || values.recipeIdea.trim() === "") {
      setError("Please enter what you'd like to make.");
      addLog("ERROR: Recipe idea is empty");
      return;
    }
    completeChecklistItem(validateId);

    setIsLoading(true);
    setError(null);

    try {
      const endpointId = addChecklistItem("Connecting to AI provider...");
      const endpoint = API_ENDPOINTS[preferences.apiProvider];
      // Custom provider uses user-defined endpoint, skip validation
      if (preferences.apiProvider !== "custom" && !endpoint) {
        throw new Error("Invalid API provider selected");
      }
      addLog(
        `Endpoint: ${endpoint || (preferences.apiProvider === "custom" ? "custom endpoint (configured in preferences)" : "unknown")}`,
      );
      completeChecklistItem(endpointId);

      const buildId = addChecklistItem("Building recipe request...");
      let requestBody: Record<string, unknown> = {};
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Build dietary requirements string
      let dietaryString = values.dietaryRequirements.filter((req) => req !== "None").join(", ");
      if (dietaryString.includes("Custom")) {
        dietaryString = dietaryString.replace("Custom", values.customDietary || "").trim();
      }
      // Clean up any trailing/leading commas and extra whitespace
      dietaryString = dietaryString.replace(/,\s*,/g, ",").replace(/,\s*$/, "").replace(/^\s*,/, "").trim();
      dietaryString = dietaryString || "None";
      addLog(`Final dietary string: ${dietaryString}`);
      completeChecklistItem(buildId);

      const configureId = addChecklistItem("Configuring API request...");
      // Configure request based on provider
      let fetchEndpoint = endpoint;
      addLog(`Configuring API request for ${preferences.apiProvider}`);

      if (preferences.apiProvider === "gemini") {
        fetchEndpoint = `${endpoint}?key=${preferences.apiKey}`;
        addLog(`Using Gemini native endpoint with key in URL`);
        requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `You are a world-class chef. Generate a detailed recipe in JSON format. Schema: {
  "title": string,
  "ingredients": string[],
  "instructions": string[]
}. Focus on the style: ${values.cookingStyle}. Be creative and specific with ingredients and cooking techniques.

Recipe Idea: ${values.recipeIdea}
Dietary Requirements: ${dietaryString}`,
                },
              ],
            },
          ],
        };
      } else if (preferences.apiProvider === "chatgpt") {
        headers["Authorization"] = `Bearer ${preferences.apiKey}`;
        addLog(`Using ChatGPT with Bearer token`);
        requestBody = {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a world-class chef. Generate detailed recipes in JSON format.",
            },
            {
              role: "user",
              content: `Generate a detailed recipe in JSON format. Schema: {
  "title": string,
  "ingredients": string[],
  "instructions": string[]
}. Focus on the style: ${values.cookingStyle}. Be creative and specific with ingredients and cooking techniques.

Recipe Idea: ${values.recipeIdea}
Dietary Requirements: ${dietaryString}`,
            },
          ],
        };
      } else if (preferences.apiProvider === "claude") {
        headers["x-api-key"] = preferences.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        addLog(`Using Claude with x-api-key header`);
        requestBody = {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: "You are a world-class chef. Generate detailed recipes in JSON format.",
          messages: [
            {
              role: "user",
              content: `Generate a detailed recipe in JSON format. Schema: {
  "title": string,
  "ingredients": string[],
  "instructions": string[]
}. Focus on the style: ${values.cookingStyle}. Be creative and specific with ingredients and cooking techniques.

Recipe Idea: ${values.recipeIdea}
Dietary Requirements: ${dietaryString}`,
            },
          ],
        };
      } else if (preferences.apiProvider === "custom") {
        if (!preferences.customEndpoint) {
          throw new Error("Custom provider requires endpoint URL in preferences");
        }
        fetchEndpoint = preferences.customEndpoint;
        headers["Authorization"] = `Bearer ${preferences.apiKey}`;
        const model = preferences.customModel || "gpt-3.5-turbo";
        addLog(`Using custom provider: ${preferences.customEndpoint} with model ${model}`);
        requestBody = {
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a world-class chef. Generate detailed recipes in JSON format.",
            },
            {
              role: "user",
              content: `Generate a detailed recipe in JSON format. Schema: {
  "title": string,
  "ingredients": string[],
  "instructions": string[]
}. Focus on the style: ${values.cookingStyle}. Be creative and specific with ingredients and cooking techniques.

Recipe Idea: ${values.recipeIdea}
Dietary Requirements: ${dietaryString}`,
            },
          ],
        };
      }
      completeChecklistItem(configureId);

      const fetchId = addChecklistItem("Sending request to AI...");
      addLog(`Request body: ${JSON.stringify(requestBody).substring(0, 200)}...`);
      addLog(`Fetching from: ${endpoint}`);

      const response = await fetch(fetchEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);
      completeChecklistItem(fetchId);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`ERROR Response body: ${errorText}`);
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const parseId = addChecklistItem("Parsing AI response...");
      const data = (await response.json()) as Record<string, unknown>;
      addLog(`Response data: ${JSON.stringify(data).substring(0, 300)}...`);

      let generatedRecipe = "";

      // Parse response based on provider
      let rawText = "";
      if (preferences.apiProvider === "gemini") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawText = (data as any).candidates?.[0]?.content?.parts?.[0]?.text || "Failed to parse recipe";
      } else if (preferences.apiProvider === "chatgpt") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawText = (data as any).choices?.[0]?.message?.content || "Failed to parse recipe";
      } else if (preferences.apiProvider === "claude") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawText = (data as any).content?.[0]?.text || "Failed to parse recipe";
      } else if (preferences.apiProvider === "custom") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawText = (data as any).choices?.[0]?.message?.content || "Failed to parse recipe";
      }

      addLog(`Raw text length: ${rawText.length}`);

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText;

      try {
        const recipeData = JSON.parse(jsonString);
        generatedRecipe = `# ${recipeData.title}

## Ingredients
${recipeData.ingredients.map((ing: string) => `- ${ing}`).join("\n")}

## Instructions
${recipeData.instructions.map((inst: string, i: number) => `${i + 1}. ${inst}`).join("\n")}`;
        addLog("Successfully parsed recipe JSON");
      } catch {
        addLog("JSON parsing failed, using raw text");
        // If JSON parsing fails, show raw text
        generatedRecipe = rawText;
      }
      completeChecklistItem(parseId);

      const formatId = addChecklistItem("Formatting recipe...");
      completeChecklistItem(formatId);

      setRecipe(generatedRecipe);
      await showToast({
        style: Toast.Style.Success,
        title: "Recipe Generated",
        message: "Your recipe is ready",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate recipe";
      addLog(`ERROR: ${errorMessage}`);
      if (err instanceof Error) {
        addLog(`ERROR Stack: ${err.stack}`);
      }
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show authentication view if not logged in and auth check is complete, or if forced
  if ((!isAuthenticated && !skipAuth && authChecked) || forceAuthScreen) {
    return (
      <Detail
        markdown={`## 🔐 Authentication\n\nSign in with GitHub to unlock the full recipe generation experience. Your support helps us improve the project.\n\nClick below to sign in with your GitHub account.\n\n[Why sign in?](https://cookeryapp.pages.dev/whysignin)\n\nPrefer not to sign in? Press ${keyboardShortcut} to continue without an account.`}
        actions={
          <ActionPanel>
            <Action title="Sign in with GitHub" onAction={handleLogin} />
            <Action
              title="Use Without Account"
              onAction={async () => {
                setSkipAuth(true);
                setForceAuthScreen(false);
                await LocalStorage.setItem("cookery_skip_auth", "true");
              }}
              shortcut={{ modifiers: [isMac ? "cmd" : "ctrl"], key: "enter" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show authenticated view with signout option (only after fresh login)
  if (isAuthenticated && justLoggedIn && showAuthenticatedView && !recipe && !isLoading && !error) {
    return (
      <Detail
        markdown={`## ✅ Authenticated\n\nYou are signed in with GitHub.\n\nYou can now generate recipes.`}
        actions={
          <ActionPanel>
            <Action
              title="Continue"
              onAction={() => {
                setShowAuthenticatedView(false);
                setJustLoggedIn(false);
              }}
            />
            <Action title="Sign out" onAction={handleSignout} />
            <Action.OpenInBrowser
              title="My Account"
              url="https://github.com/settings/connections/applications/Ov23lixtTVkXJr1vXPP3"
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show configuration view if API key or provider is missing
  if (!preferences.apiKey || !preferences.apiProvider) {
    const needsCustomEndpoint = preferences.apiProvider === "custom" && !preferences.customEndpoint;
    const statusText = needsCustomEndpoint
      ? `- API Provider: ${preferences.apiProvider || "Not set"}\n- API Key: ${preferences.apiKey ? "Set" : "Not set"}\n- Custom Endpoint: ${preferences.customEndpoint || "Not set"}`
      : `- API Provider: ${preferences.apiProvider || "Not set"}\n- API Key: ${preferences.apiKey ? "Set" : "Not set"}`;

    return (
      <Detail
        markdown={`## Configuration Required\n\nTo use the Cookery extension, you need to configure your API provider and API key in the extension preferences.\n\n**Current Status:**\n${statusText}\n\n**Supported Providers:**\n- Gemini (Google)\n- ChatGPT (OpenAI)\n- Claude (Anthropic)\n- Custom (OpenAI-compatible)\n\nClick the button below to open preferences and configure your settings.`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
            {preferences.apiProvider === "custom" && (
              <Action.OpenInBrowser
                title="Check Custom Provider Support"
                url="https://cookeryapp.pages.dev/support?jump=customproviders"
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Show configuration view if custom provider is selected but endpoint is missing
  if (preferences.apiProvider === "custom" && !preferences.customEndpoint) {
    return (
      <Detail
        markdown={`## Configuration Required\n\nYou selected the Custom provider but haven't configured a custom endpoint.\n\n**Current Status:**\n- API Provider: ${preferences.apiProvider}\n- API Key: ${preferences.apiKey ? "Set" : "Not set"}\n- Custom Endpoint: Not set\n\nPlease configure your custom endpoint in preferences.\n\n**Note:** Custom providers must be OpenAI-compatible. Check the support page for more information.`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              title="Check Custom Provider Support"
              url="https://cookeryapp.pages.dev/support?jump=customproviders"
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show recipe result if available
  if (recipe) {
    return (
      <Detail
        markdown={`# Generated Recipe\n\n${recipe}`}
        actions={
          <ActionPanel>
            <Action title="Generate New Recipe" onAction={() => setRecipe(null)} />
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
            {isAuthenticated && <Action title="Sign out" onAction={handleSignout} />}
          </ActionPanel>
        }
      />
    );
  }

  // Show loading view with checklist
  if (isLoading) {
    const checklistMarkdown = checklist.map((item) => `- ${item.completed ? "✅" : "⏳"} ${item.text}`).join("\n");
    const logMarkdown = showLogs && logs ? `\n\n---\n\n## Debug Logs\n\n\`\`\`\n${logs}\n\`\`\`` : "";
    return (
      <Detail
        markdown={`# 🍳 Generating Recipes\n\n## Progress\n\n${checklistMarkdown}${logMarkdown}`}
        actions={
          <ActionPanel>
            <Action title="Toggle Logs" onAction={() => setShowLogs(!showLogs)} />
            {logs && (
              <Action.CopyToClipboard
                title="Copy Logs"
                content={logs}
                onCopy={() => showToast({ style: Toast.Style.Success, title: "Logs copied to clipboard" })}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Show error view if there's an error
  if (error) {
    const logMarkdown = logs ? `---\n\n## Debug Logs\n\n\`\`\`\n${logs}\n\`\`\`` : "";
    return (
      <Detail
        markdown={`## Error\n\n${error}\n\n${logMarkdown}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={() => setError(null)} />
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
            {logs && (
              <Action.CopyToClipboard
                title="Copy Logs"
                content={logs}
                onCopy={() => showToast({ style: Toast.Style.Success, title: "Logs copied to clipboard" })}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Show form
  console.log("Rendering form - isAuthenticated:", isAuthenticated, "authChecked:", authChecked);
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Recipe" onSubmit={handleSubmit} />
          <Action
            title="Cooking with Cookery Guidelines"
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Open Guidelines",
                message: "Do you want to open the Cooking with Cookery Guidelines?",
                primaryAction: {
                  title: "Open",
                  style: Alert.ActionStyle.Default,
                },
              });
              if (confirmed) {
                open("https://cookeryapp.pages.dev/safety");
              }
            }}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
          />
          {isAuthenticated && (
            <Action.OpenInBrowser
              title="My Account"
              url="https://github.com/settings/connections/applications/Ov23lixtTVkXJr1vXPP3"
            />
          )}
          {isAuthenticated && <Action title="Sign out" onAction={handleSignout} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your recipe preferences and let Lola AI generate a custom recipe for you." />
      <Form.Separator />
      <Form.TextField
        id="recipeIdea"
        title="What would you like to make?"
        placeholder="e.g., a spicy pasta dish"
        defaultValue=""
      />
      <Form.TagPicker
        id="dietaryRequirements"
        title="Dietary Requirements"
        onChange={(values) => setDietaryRequirements(values)}
        defaultValue={preferences.defaultDietaryRequirements ? [preferences.defaultDietaryRequirements] : ["None"]}
      >
        {DIETARY_REQUIREMENTS.map((requirement) => (
          <Form.TagPicker.Item key={requirement} value={requirement} title={requirement} />
        ))}
      </Form.TagPicker>
      {dietaryRequirements.includes("Custom") && (
        <Form.TextField
          id="customDietary"
          title="Custom Dietary Requirements"
          placeholder="e.g., Low-carb, High-protein"
        />
      )}
      <Form.Dropdown
        id="cookingStyle"
        title="Cooking Style"
        defaultValue={preferences.defaultCookingStyle || "Quick & Easy"}
      >
        {COOKING_STYLES.map((style) => (
          <Form.Dropdown.Item key={style} value={style} title={style} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
