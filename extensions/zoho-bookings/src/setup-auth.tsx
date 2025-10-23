import { Action, ActionPanel, Form, showToast, Toast, Detail, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { exchangeAuthCodeForTokens, getAuthorizationInstructions } from "./oauth/zoho-provider";

interface Preferences {
  dataCenter: string;
}

export default function SetupZohoAuth() {
  const [authCode, setAuthCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit() {
    if (!authCode.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter an authorization code",
      });
      return;
    }

    setIsLoading(true);
    try {
      await exchangeAuthCodeForTokens(authCode.trim());
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  if (showSuccess) {
    return (
      <Detail
        markdown={`# ✅ Authentication Successful!

Your Zoho Bookings account has been connected successfully.

You can now use the following commands:
- **View Appointments** - View your upcoming appointments
- **Browse Services** - View available booking services

The extension will automatically refresh your access token when needed.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Zoho Bookings" url={`https://bookings.zoho.${preferences.dataCenter}`} />
          </ActionPanel>
        }
      />
    );
  }

  const instructions = getAuthorizationInstructions();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Zoho Api Console"
            url={`https://api-console.zoho.${preferences.dataCenter}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Setup Instructions" text={instructions} />
      <Form.Separator />
      <Form.TextField
        id="authCode"
        title="Authorization Code"
        placeholder="Paste your authorization code here"
        value={authCode}
        onChange={setAuthCode}
        info="The code is valid only for the duration you selected (3-10 minutes)"
      />
      <Form.Description text="⚠️ Important: The authorization code expires quickly. Generate it just before pasting it here." />
    </Form>
  );
}
