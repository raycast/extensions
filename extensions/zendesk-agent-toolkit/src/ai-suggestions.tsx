import { Action, ActionPanel, List, Detail, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { MacroSuggestion } from "./ai-service";
import { ticketMonitor } from "./ticket-monitor";
import { createMacro } from "./zendesk";
import { AISuggestionListItem } from "./components/common";

export interface AISuggestionsProps {
  onRefresh?: () => void;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<MacroSuggestion[]>([]);

  useEffect(() => {
    loadSuggestions();
  }, []);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const newSuggestions = await ticketMonitor.checkForResolvedTickets();
      setSuggestions(newSuggestions);

      if (newSuggestions.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${newSuggestions.length} AI macro suggestions`,
        });
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load AI suggestions",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function createMacroFromSuggestion(suggestion: MacroSuggestion) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating macro from AI suggestion...",
      });

      await createMacro({
        title: suggestion.title,
        description: `${suggestion.description} (AI-generated from pattern analysis)`,
        actions: suggestion.actions,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "AI macro created successfully",
        message: `Created "${suggestion.title}"`,
      });

      // Remove this suggestion from the list
      setSuggestions((prev) => prev.filter((s) => s !== suggestion));

      if (onRefresh) {
        onRefresh();
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create macro",
        message: String(e),
      });
    }
  }

  function dismissSuggestion(suggestion: MacroSuggestion) {
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
    showToast({
      style: Toast.Style.Success,
      title: "Suggestion dismissed",
    });
  }

  return (
    <List
      isLoading={loading}
      navigationTitle="AI Macro Suggestions"
      searchBarPlaceholder="Search AI suggestions..."
      actions={
        <ActionPanel>
          <Action title="Refresh Suggestions" onAction={loadSuggestions} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    >
      {suggestions.length === 0 && !loading && (
        <List.EmptyView
          title="No AI Suggestions"
          description="AI will analyze your resolved tickets and suggest macros for common patterns"
          icon="🤖"
          actions={
            <ActionPanel>
              <Action title="Check for New Suggestions" onAction={loadSuggestions} />
            </ActionPanel>
          }
        />
      )}

      {suggestions.map((suggestion, index) => (
        <AISuggestionListItem
          index={index}
          title={suggestion.title}
          description={suggestion.description}
          confidence={suggestion.confidence}
          actionsCount={suggestion.actions.length}
          actions={
            <ActionPanel>
              <Action title="Create This Macro" icon="⚡" onAction={() => createMacroFromSuggestion(suggestion)} />
              <Action.Push
                title="View Details"
                target={
                  <SuggestionDetails
                    suggestion={suggestion}
                    onCreateMacro={() => createMacroFromSuggestion(suggestion)}
                  />
                }
              />
              <Action
                title="Dismiss Suggestion"
                icon={Icon.XMarkCircle}
                onAction={() => dismissSuggestion(suggestion)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Refresh Suggestions"
                onAction={loadSuggestions}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

interface SuggestionDetailsProps {
  suggestion: MacroSuggestion;
  onCreateMacro: () => void;
}

function SuggestionDetails({ suggestion, onCreateMacro }: SuggestionDetailsProps) {
  const formatActions = (): string => {
    return suggestion.actions
      .map((action) => {
        const field = action.field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        return `**${field}:** ${action.value}`;
      })
      .join("\n\n");
  };

  const confidenceLevel = suggestion.confidence >= 0.8 ? "High" : suggestion.confidence >= 0.6 ? "Medium" : "Low";

  const markdown = `
# ${suggestion.title}

${suggestion.description}

---

## AI Analysis

**Pattern Detected:** ${suggestion.pattern_match}

**Confidence Level:** ${Math.round(suggestion.confidence * 100)}% (${confidenceLevel})

**Reasoning:** ${suggestion.reasoning}

${suggestion.similar_tickets.length > 0 ? `**Similar Tickets:** #${suggestion.similar_tickets.join(", #")}` : ""}

---

## Proposed Macro Actions

${formatActions()}

---

## What This Macro Will Do

This AI-generated macro will automatically:
${suggestion.actions
  .map((action) => {
    if (action.field === "status") return `• Set ticket status to "${action.value}"`;
    if (action.field === "priority") return `• Change priority to "${action.value}"`;
    if (action.field === "comment") return `• Add a standardized response`;
    if (action.field === "assignee_id") return `• Assign the ticket appropriately`;
    return `• Update ${action.field} to "${action.value}"`;
  })
  .join("\n")}

This pattern was identified by analyzing your recent ticket resolutions and finding common workflows that could be automated.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Create This Macro" icon="⚡" onAction={onCreateMacro} />
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={popToRoot} />
        </ActionPanel>
      }
    />
  );
}

export default AISuggestions;
export { AISuggestions };
