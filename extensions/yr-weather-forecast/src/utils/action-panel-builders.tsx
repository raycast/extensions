import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";

/**
 * Reusable ActionPanel builders to eliminate duplication
 * Consolidates common ActionPanel patterns used throughout the application
 */

export class ActionPanelBuilders {
  /**
   * Create error handling actions (Retry, Reset, Show Error Details)
   * Used in error boundaries and error fallbacks
   */
  static createErrorActions(onRetry: () => void, onReset: () => void, error?: Error) {
    return (
      <ActionPanel>
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          onAction={onRetry}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Reset"
          icon={Icon.Trash}
          onAction={onReset}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        {error && (
          <Action
            title="Show Error Details"
            icon={Icon.Info}
            onAction={() => {
              showToast({
                style: Toast.Style.Failure,
                title: "Error Details",
                message: error.message,
              });
            }}
          />
        )}
      </ActionPanel>
    );
  }

  /**
   * Create welcome message actions
   * Used in various components to show welcome message
   */
  static createWelcomeActions(onShowWelcome: () => void) {
    return (
      <ActionPanel>
        <Action
          title="Show Welcome Message"
          icon={Icon.Info}
          onAction={onShowWelcome}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        />
      </ActionPanel>
    );
  }

  /**
   * Create refresh/retry actions
   * Used in loading states and refresh scenarios
   */
  static createRefreshActions(onRefresh: () => void, title: string = "Refresh") {
    return (
      <ActionPanel>
        <Action title={title} icon={Icon.ArrowClockwise} onAction={onRefresh} />
      </ActionPanel>
    );
  }

  /**
   * Create network retry actions
   * Used for network-related error states
   */
  static createNetworkRetryActions(onRetry: () => void) {
    return (
      <ActionPanel>
        <Action title="Retry Network Tests" icon={Icon.ArrowClockwise} onAction={onRetry} />
        <Action
          title="Show Error Details"
          icon={Icon.Info}
          onAction={async () => {
            await showToast({
              style: Toast.Style.Failure,
              title: "Network Error Details",
              message: "Check your internet connection and try again",
            });
          }}
        />
      </ActionPanel>
    );
  }

  /**
   * Create forecast actions
   * Used for forecast-related components
   */
  static createForecastActions(onOpenForecast: () => void, onShowWelcome?: () => void, preloadForecast?: () => void) {
    return (
      <ActionPanel>
        <Action.Push title="Open Forecast" icon={Icon.Clock} onHover={preloadForecast} target={onOpenForecast()} />
        {onShowWelcome && (
          <Action
            title="Show Welcome Message"
            icon={Icon.Info}
            onAction={onShowWelcome}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          />
        )}
      </ActionPanel>
    );
  }

  /**
   * Create welcome message toggle actions
   * Used in main command for showing/hiding welcome message
   */
  static createWelcomeToggleActions(onShowWelcome: () => void, onHideWelcome: () => void) {
    return (
      <ActionPanel>
        <Action
          title="Show Welcome Message"
          icon={Icon.Info}
          onAction={onShowWelcome}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        />
        <Action
          title="Hide Welcome Message"
          icon={Icon.Info}
          onAction={onHideWelcome}
          shortcut={{ modifiers: ["cmd", "shift", "alt"], key: "w" }}
        />
      </ActionPanel>
    );
  }

  /**
   * Create test actions for development
   * Used in test components and development tools
   */
  static createTestActions(
    onTest: () => void,
    onReset: () => void,
    testTitle: string = "Test",
    resetTitle: string = "Reset",
  ) {
    return (
      <ActionPanel>
        <Action title={testTitle} icon={Icon.ExclamationMark} onAction={onTest} />
        <Action title={resetTitle} icon={Icon.ArrowClockwise} onAction={onReset} />
      </ActionPanel>
    );
  }
}
