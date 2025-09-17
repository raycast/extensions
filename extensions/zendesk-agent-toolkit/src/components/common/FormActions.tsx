import React from "react";
import { ActionPanel, Action } from "@raycast/api";

interface FormActionsProps {
  submitTitle?: string;
  onSubmit: () => void;
  additionalActions?: React.ReactNode;
  submitIcon?: string;
}

export function FormActions({
  submitTitle = "Submit",
  onSubmit,
  additionalActions,
  submitIcon = "✅",
}: FormActionsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm title={submitTitle} onSubmit={onSubmit} icon={submitIcon} />
      {additionalActions}
    </ActionPanel>
  );
}
