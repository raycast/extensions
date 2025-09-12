import React, { Component, ReactNode } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { ActionPanelBuilders } from "../utils/action-panel-builders";
import { DebugLogger } from "../utils/debug-utils";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  componentName?: string;
}

/**
 * Error Boundary component for graceful error handling
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName = "Unknown Component" } = this.props;

    // Enhanced error logging
    const errorDetails = {
      component: componentName,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    DebugLogger.error(`Error Boundary caught error in ${componentName}:`, errorDetails);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Show user-friendly toast notification
    showToast({
      style: Toast.Style.Failure,
      title: "Component Error",
      message: `Something went wrong in ${componentName}. Please try again.`,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Max Retries Reached",
        message: "Unable to recover from this error. Please restart the extension.",
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <List.Section title="⚠️ Error">
          <List.Item
            title="Something went wrong"
            subtitle={`Error in ${this.props.componentName || "component"}`}
            icon="⚠️"
            accessories={[
              {
                text: `Retry ${this.state.retryCount}/${this.props.maxRetries || 3}`,
                tooltip: "Number of retry attempts",
              },
            ]}
            actions={ActionPanelBuilders.createErrorActions(this.handleRetry, this.handleReset, this.state.error)}
          />
        </List.Section>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for error boundary functionality in functional components
 * Note: This doesn't replace ErrorBoundary for catching errors, but provides
 * error state management for components that can handle their own errors
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    DebugLogger.error("Error caught by useErrorHandler:", error);
    setError(error);
  }, []);

  // Reset error when component unmounts
  React.useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return {
    error,
    handleError,
    resetError,
    hasError: error !== null,
  };
}
