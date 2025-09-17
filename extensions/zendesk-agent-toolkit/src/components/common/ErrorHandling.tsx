import React, { Component } from "react";
import { showToast, Toast, Form, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// Error display types
export type ErrorType = "validation" | "api" | "network" | "permission" | "generic";

// Common error messages
export const ERROR_MESSAGES = {
  NETWORK: "Network connection failed. Please check your internet connection.",
  PERMISSION: "You don't have permission to perform this action.",
  VALIDATION: "Please check your input and try again.",
  API_GENERIC: "An error occurred while communicating with Zendesk.",
  LOADING_FAILED: "Failed to load data. Please try again.",
  SAVE_FAILED: "Failed to save changes. Please try again.",
  DELETE_FAILED: "Failed to delete item. Please try again.",
  AUTHENTICATION: "Authentication failed. Please check your credentials.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
} as const;

// Error Toast Functions
export async function showErrorToast(title: string, message?: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

export async function showSuccessToast(title: string, message?: string): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export async function showLoadingToast(title: string, message?: string): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title,
    message,
  });
}

export async function showWarningToast(title: string, message?: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `⚠️ ${title}`,
    message,
  });
}

// Enhanced error handler that determines error type and shows appropriate message
export async function handleError(error: unknown, context: string = "Operation"): Promise<void> {
  console.error(`${context} error:`, error);

  let title = `${context} Failed`;
  let message: string = ERROR_MESSAGES.API_GENERIC;

  if (error instanceof Error) {
    message = error.message;

    // Detect specific error types
    if (error.message.includes("401") || error.message.includes("unauthorized")) {
      title = "Authentication Failed";
      message = ERROR_MESSAGES.AUTHENTICATION;
    } else if (error.message.includes("403") || error.message.includes("forbidden")) {
      title = "Permission Denied";
      message = ERROR_MESSAGES.PERMISSION;
    } else if (error.message.includes("429") || error.message.includes("rate limit")) {
      title = "Rate Limited";
      message = ERROR_MESSAGES.RATE_LIMIT;
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      title = "Network Error";
      message = ERROR_MESSAGES.NETWORK;
    }
  }

  await showErrorToast(title, message);
}

// Validation error handler
export async function handleValidationError(field: string, reason: string): Promise<void> {
  await showErrorToast("Validation Error", `${field}: ${reason}`);
}

// API-specific error handler that uses showFailureToast from @raycast/utils
export async function handleApiError(error: unknown, context: string = "API Operation"): Promise<void> {
  await showFailureToast(error, { title: `${context} Failed` });
}

// Form validation helpers
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validateUrl(url: string): string | null {
  try {
    new URL(url);
    return null;
  } catch {
    return "Please enter a valid URL";
  }
}

// Error Boundary Component (React-based)
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
  onError?: (error: Error) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught an error:", error, errorInfo);
    (this as any).props.onError?.(error);
  }

  render() {
    if ((this as any).state.hasError && (this as any).state.error) {
      if ((this as any).props.fallback) {
        return (this as any).props.fallback((this as any).state.error);
      }

      return (
        <Form
          actions={
            <ActionPanel>
              <Action title="Reload" onAction={() => (this as any).setState({ hasError: false, error: undefined })} />
            </ActionPanel>
          }
        >
          <Form.Description
            title="Something went wrong"
            text={`An unexpected error occurred: ${(this as any).state.error.message}`}
          />
        </Form>
      );
    }

    return (this as any).props.children;
  }
}

// Error Display Components
interface ErrorDisplayProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorDisplay({ title, message, onRetry, showRetry = true }: ErrorDisplayProps) {
  return (
    <Form actions={<ActionPanel>{showRetry && onRetry && <Action title="Retry" onAction={onRetry} />}</ActionPanel>}>
      <Form.Description title={title} text={message || "An unexpected error occurred"} />
    </Form>
  );
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  options: {
    showLoading?: boolean;
    showSuccess?: boolean;
    successMessage?: string;
    useFailureToast?: boolean;
  } = {},
): Promise<T | null> {
  const { showLoading = false, showSuccess = false, successMessage, useFailureToast = false } = options;

  try {
    if (showLoading) {
      await showLoadingToast(`${context}...`);
    }

    const result = await operation();

    if (showSuccess) {
      await showSuccessToast(`${context} Successful`, successMessage);
    }

    return result;
  } catch (error) {
    if (useFailureToast) {
      await handleApiError(error, context);
    } else {
      await handleError(error, context);
    }
    return null;
  }
}

// Custom hook for error state management
export function useErrorState() {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncOperation = React.useCallback(
    async (operation: () => Promise<any>, context: string = "Operation"): Promise<any | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        await handleError(err, context);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    error,
    isLoading,
    clearError,
    handleAsyncOperation,
  };
}
