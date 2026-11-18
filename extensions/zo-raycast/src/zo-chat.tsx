import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityStore } from "./core/activity/ActivityStore";
import { UserSettings } from "./core/config/UserSettings";
import { ErrorNormalizer } from "./core/errors/ErrorNormalizer";
import { createClients } from "./core/factory/createClients";
import { createId } from "./core/utils/createId";
import type { ToolExecutionRecord, ZoMessage, ZoModel } from "./types/domain";

type ChatMessage = ZoMessage & {
  id: string;
  createdAtIso: string;
  modelId?: string;
};

type ChatState = {
  loadingModels: boolean;
  models: ZoModel[];
  selectedModelId: string;
  conversationId?: string;
  conversation: ChatMessage[];
  selectedMessageId?: string;
  pending: boolean;
};

function normalizeTextBlock(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function toPreview(text: string): string {
  const condensed = text.replace(/\s+/g, " ").trim();
  if (condensed.length <= 90) {
    return condensed;
  }

  return `${condensed.slice(0, 87)}...`;
}

function hasThinking(message: ChatMessage | undefined): boolean {
  return Boolean(message && message.role === "assistant" && (message.thinking ?? "").trim().length > 0);
}

function detailMarkdownForMessage(message: ChatMessage, showThinking: boolean): string {
  if (message.role === "assistant") {
    const sections: string[] = [];
    const answer = normalizeTextBlock(message.content);
    sections.push(answer.trim().length > 0 ? answer : "_Waiting for response..._");

    const thinking = normalizeTextBlock(message.thinking ?? "");
    if (showThinking && thinking.trim().length > 0) {
      sections.push(["---", "### Thinking", thinking].join("\n\n"));
    }

    return sections.join("\n\n");
  }

  const userContent = normalizeTextBlock(message.content);
  return userContent.trim().length > 0 ? userContent : "_No message content._";
}

function toApiConversation(conversation: ChatMessage[]): ZoMessage[] {
  return conversation.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export default function ZoChatCommand() {
  const [state, setState] = useState<ChatState>({
    loadingModels: true,
    models: [],
    selectedModelId: "",
    conversationId: undefined,
    conversation: [],
    selectedMessageId: undefined,
    pending: false,
  });
  const [prompt, setPrompt] = useState("");
  const [showThinking, setShowThinking] = useState(false);

  const modelItems = useMemo(() => {
    return state.models.map((model) => ({
      id: model.id,
      label: model.label,
    }));
  }, [state.models]);

  const selectedMessage = useMemo(() => {
    if (!state.selectedMessageId) {
      return undefined;
    }

    return state.conversation.find((message) => message.id === state.selectedMessageId);
  }, [state.conversation, state.selectedMessageId]);

  const selectedAssistantMessage = useMemo(() => {
    if (!selectedMessage || selectedMessage.role !== "assistant") {
      return undefined;
    }

    return selectedMessage;
  }, [selectedMessage]);

  const initialize = useCallback(async () => {
    setState((current) => ({
      ...current,
      loadingModels: true,
    }));

    try {
      const { apiClient } = createClients();
      const [models, defaultModelId] = await Promise.all([apiClient.listModels(), UserSettings.getDefaultModel()]);
      const selectedModelId =
        defaultModelId && models.some((model) => model.id === defaultModelId) ? defaultModelId : (models[0]?.id ?? "");

      setState((current) => ({
        ...current,
        loadingModels: false,
        models,
        selectedModelId,
        conversationId: undefined,
      }));
    } catch (error) {
      const normalizedError = ErrorNormalizer.fromUnknown(error);
      setState((current) => ({
        ...current,
        loadingModels: false,
      }));

      await showToast({
        style: Toast.Style.Failure,
        title: normalizedError.title,
        message: normalizedError.message,
      });
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const clearConversation = useCallback(() => {
    setState((current) => ({
      ...current,
      conversationId: undefined,
      conversation: [],
      selectedMessageId: undefined,
    }));
    setPrompt("");
  }, []);

  const onModelChange = useCallback((selectedModelId: string) => {
    setState((current) => ({
      ...current,
      selectedModelId,
      conversationId: undefined,
      conversation: [],
      selectedMessageId: undefined,
    }));

    void UserSettings.setDefaultModel(selectedModelId).catch(async (error) => {
      const normalizedError = ErrorNormalizer.fromUnknown(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save selected model",
        message: normalizedError.message,
      });
    });
  }, []);

  const submitPrompt = useCallback(async () => {
    if (state.pending) {
      return;
    }

    const promptText = prompt.trim();
    if (!promptText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Message required",
      });
      return;
    }

    if (!state.selectedModelId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model required",
      });
      return;
    }

    const timestampIso = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: promptText,
      createdAtIso: timestampIso,
    };
    const assistantMessageId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      thinking: "",
      modelId: state.selectedModelId,
      createdAtIso: timestampIso,
    };

    const conversationBeforeResponse = [...state.conversation, userMessage];
    const optimisticConversation = [...conversationBeforeResponse, assistantMessage];

    setState((current) => ({
      ...current,
      pending: true,
      conversation: optimisticConversation,
      selectedMessageId: assistantMessageId,
    }));
    setPrompt("");
    let streamEnabled = false;

    try {
      const { apiClient, config } = createClients();
      streamEnabled = config.enableChatStreaming === true;
      let streamedAnswerText = "";
      let streamedThinkingText = "";
      const response = streamEnabled
        ? await apiClient.chatStream(
            {
              model: state.selectedModelId,
              messages: toApiConversation(conversationBeforeResponse),
              conversationId: state.conversationId,
            },
            (delta, kind) => {
              if (kind === "thinking") {
                streamedThinkingText += delta;
              } else {
                streamedAnswerText += delta;
              }

              setState((current) => ({
                ...current,
                conversation: current.conversation.map((message) => {
                  if (message.id !== assistantMessageId) {
                    return message;
                  }

                  return {
                    ...message,
                    content: streamedAnswerText.length > 0 ? streamedAnswerText : message.content,
                    thinking: streamedThinkingText.length > 0 ? streamedThinkingText : message.thinking,
                  };
                }),
              }));
            },
          )
        : await apiClient.chat({
            model: state.selectedModelId,
            messages: toApiConversation(conversationBeforeResponse),
            conversationId: state.conversationId,
            stream: false,
          });

      setState((current) => ({
        ...current,
        pending: false,
        conversation: current.conversation.map((message) => {
          if (message.id !== assistantMessageId) {
            return message;
          }

          return {
            ...message,
            content:
              response.outputText.length > 0
                ? response.outputText
                : streamedAnswerText.length > 0
                  ? streamedAnswerText
                  : message.content,
            thinking:
              response.thinkingText ?? (streamedThinkingText.length > 0 ? streamedThinkingText : message.thinking),
          };
        }),
        conversationId: response.conversationId ?? current.conversationId,
        selectedMessageId: assistantMessageId,
      }));

      const record: ToolExecutionRecord = {
        id: createId(),
        toolName: "zo.chat",
        target: "zo-api",
        riskLevel: "safe",
        timestampIso: new Date().toISOString(),
        parameters: {
          model: state.selectedModelId,
          prompt: userMessage.content,
          stream: streamEnabled,
        },
        outcome: "success",
      };
      await ActivityStore.append(record);
    } catch (error) {
      const normalizedError = ErrorNormalizer.fromUnknown(error);
      setPrompt(promptText);
      setState((current) => ({
        ...current,
        pending: false,
        conversation: current.conversation.map((message) => {
          if (message.id !== assistantMessageId) {
            return message;
          }

          return {
            ...message,
            content: `Failed to get response.\n\n${normalizedError.message}`,
            thinking: undefined,
          };
        }),
        selectedMessageId: assistantMessageId,
      }));

      const record: ToolExecutionRecord = {
        id: createId(),
        toolName: "zo.chat",
        target: "zo-api",
        riskLevel: "safe",
        timestampIso: new Date().toISOString(),
        parameters: {
          model: state.selectedModelId,
          prompt: userMessage.content,
          stream: streamEnabled,
        },
        outcome: "failed",
        errorMessage: normalizedError.message,
      };
      await ActivityStore.append(record);

      await showToast({
        style: Toast.Style.Failure,
        title: normalizedError.title,
        message: normalizedError.message,
      });
    }
  }, [prompt, state.conversation, state.conversationId, state.pending, state.selectedModelId]);

  const actions = (
    <ActionPanel>
      <Action
        title="Send Message"
        icon={Icon.Airplane}
        onAction={() => void submitPrompt()}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
      />
      <Action
        title="New Chat"
        icon={Icon.Plus}
        onAction={clearConversation}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action title="Reload Models" icon={Icon.ArrowClockwise} onAction={() => void initialize()} />
      <Action
        title={showThinking ? "Hide Thinking" : "Show Thinking"}
        icon={Icon.Eye}
        onAction={() => setShowThinking((current) => !current)}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
      {selectedMessage ? (
        <Action.CopyToClipboard title="Copy Selected Message" content={selectedMessage.content} />
      ) : null}
      {selectedAssistantMessage && hasThinking(selectedAssistantMessage) ? (
        <Action.CopyToClipboard title="Copy Selected Thinking" content={selectedAssistantMessage.thinking ?? ""} />
      ) : null}
      {state.conversation.length > 0 ? (
        <Action.CopyToClipboard
          title="Copy Entire Conversation"
          content={JSON.stringify(
            state.conversation.map((message) => ({
              role: message.role,
              content: message.content,
              thinking: message.thinking,
              modelId: message.modelId,
              createdAtIso: message.createdAtIso,
            })),
            null,
            2,
          )}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ) : null}
    </ActionPanel>
  );

  const selectedItemId = state.pending
    ? state.conversation.at(-1)?.id
    : (state.selectedMessageId ?? state.conversation.at(-1)?.id);

  return (
    <List
      isLoading={state.loadingModels}
      isShowingDetail
      filtering={false}
      searchText={prompt}
      onSearchTextChange={setPrompt}
      searchBarPlaceholder="Ask Zo anything..."
      searchBarAccessory={
        <List.Dropdown tooltip="Model" value={state.selectedModelId} onChange={onModelChange}>
          {modelItems.map((model) => (
            <List.Dropdown.Item key={model.id} value={model.id} title={model.label} />
          ))}
        </List.Dropdown>
      }
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        setState((current) => ({
          ...current,
          selectedMessageId: current.pending ? current.selectedMessageId : (id ?? undefined),
        }));
      }}
      actions={actions}
    >
      {state.conversation.map((message, index) => {
        const detailMarkdown = detailMarkdownForMessage(message, showThinking);
        const isAssistant = message.role === "assistant";
        const preview = toPreview(message.content);
        const title = isAssistant ? "Zo" : "You";
        const subtitle =
          preview.length > 0
            ? preview
            : isAssistant && state.pending && index === state.conversation.length - 1
              ? "Generating response..."
              : "No content";
        const assistantHasThinking = isAssistant && hasThinking(message);

        return (
          <List.Item
            key={message.id}
            id={message.id}
            title={title}
            subtitle={subtitle}
            icon={
              isAssistant
                ? { source: Icon.Wand, tintColor: Color.Blue }
                : { source: Icon.Person, tintColor: Color.SecondaryText }
            }
            accessories={[
              { text: String(index + 1) },
              ...(assistantHasThinking
                ? [
                    {
                      icon: Icon.Eye,
                      tooltip: "Thinking included",
                    },
                  ]
                : []),
            ]}
            actions={actions}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
          />
        );
      })}

      {!state.loadingModels && state.conversation.length === 0 ? (
        <List.EmptyView
          title="Ask Zo Anything"
          description="Type your message in the search bar and press Enter to send."
          actions={actions}
        />
      ) : null}
    </List>
  );
}
