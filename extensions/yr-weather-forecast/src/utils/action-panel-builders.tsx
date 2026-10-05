import { Action, ActionPanel, Icon } from "@raycast/api";

/**
 * Reusable ActionPanel builders to eliminate duplication
 * Consolidates common ActionPanel patterns used throughout the application
 */

export class ActionPanelBuilders {
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
   * Create forecast actions
   * Used for forecast-related components
   */
  static createForecastActions(onOpenForecast: () => void, onShowWelcome?: () => void) {
    return (
      <ActionPanel>
        <Action title="Open Forecast" icon={Icon.Clock} onAction={onOpenForecast} />
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
}
