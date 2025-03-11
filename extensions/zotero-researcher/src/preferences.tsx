import { Form, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

export interface ZoteroPreferences {
  apiKey: string;
  userId: string;
  useLocalDatabase: boolean;
}

export function getZoteroPreferences(): ZoteroPreferences {
  const prefs = getPreferenceValues<ZoteroPreferences>();
  return {
    apiKey: prefs.apiKey || "",
    userId: prefs.userId || "",
    useLocalDatabase: prefs.useLocalDatabase || false,
  };
}

export default function Command() {
  const [preferences, setPreferences] = useState({
    apiKey: "",
    userId: "",
    useLocalDatabase: false,
  });

  useEffect(() => {
    async function loadPreferences() {
      try {
        const storedApiKey = await LocalStorage.getItem<string>("apiKey");
        const storedUserId = await LocalStorage.getItem<string>("userId");
        const storedUseLocalDatabase = await LocalStorage.getItem<string>("useLocalDatabase");

        setPreferences({
          apiKey: storedApiKey || "",
          userId: storedUserId || "",
          useLocalDatabase: storedUseLocalDatabase === "true",
        });
      } catch (error) {
        console.error("Failed to load preferences:", error);
      }
    }

    loadPreferences();
  }, []);

  const updatePreference = async (key: string, value: string | boolean) => {
    await LocalStorage.setItem(key, value.toString());
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Form>
      <Form.TextField
        id="apiKey"
        title="Zotero API Key"
        placeholder="Enter your Zotero API key"
        value={preferences.apiKey}
        onChange={(newValue) => updatePreference("apiKey", newValue)}
      />
      <Form.TextField
        id="userId"
        title="Zotero User ID"
        placeholder="Enter your Zotero user ID"
        value={preferences.userId}
        onChange={(newValue) => updatePreference("userId", newValue)}
      />
      <Form.Checkbox
        id="useLocalDatabase"
        label="Use Local Zotero Database"
        value={preferences.useLocalDatabase}
        onChange={(newValue) => updatePreference("useLocalDatabase", newValue)}
      />
      <Form.Description text="Connect directly to local Zotero database instead of using the API. Requires Zotero desktop to be installed." />
      <Form.Separator />
    </Form>
  );
}
