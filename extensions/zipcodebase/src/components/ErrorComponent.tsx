import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ErrorResponse } from "../utils/types";

export default function ErrorComponent({ errorResponse }: { errorResponse: ErrorResponse }) {
  return "error" in errorResponse ? (
    <Detail
      markdown={`# Error

${errorResponse.error}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  ) : (
    <Detail
      markdown={`# Errors
    
${Object.values(errorResponse.errors).map((errorItem) =>
  Object.entries(errorItem).map(
    ([key, val]) => `

${key}: ${val}`
  )
)}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
