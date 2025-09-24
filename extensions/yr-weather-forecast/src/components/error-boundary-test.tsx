import React, { useState } from "react";
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { ErrorBoundary } from "./error-boundary";
import { GenericErrorFallback } from "./error-fallbacks";

/**
 * Test component that can throw errors to demonstrate error boundary functionality
 * This is for development/testing purposes only
 */
function ErrorTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("This is a test error to demonstrate error boundary functionality");
  }

  return (
    <List.Section title="🧪 Error Boundary Test">
      <List.Item
        title="Test Error Boundary"
        subtitle="Click to trigger an error and see the error boundary in action"
        icon="🧪"
        actions={
          <ActionPanel>
            <Action title="Throw Test Error" icon={Icon.ExclamationMark} onAction={() => setShouldThrow(true)} />
            <Action title="Reset Component" icon={Icon.ArrowClockwise} onAction={() => setShouldThrow(false)} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Wrapped version with error boundary for testing
 */
export function ErrorBoundaryTest() {
  return (
    <ErrorBoundary
      componentName="Error Test Component"
      fallback={<GenericErrorFallback componentName="Error Test Component" />}
    >
      <ErrorTestComponent />
    </ErrorBoundary>
  );
}
