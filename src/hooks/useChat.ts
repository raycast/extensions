import { useCallback, useRef, useState } from "react";
import { Message, streamChat } from "../api/pollinations";
import { getStoredModel } from "./useModels";

export interface ChatMessage extends Message {
  id: string;
}

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful AI assistant. Be concise and clear. Format your responses using Markdown when appropriate.",
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return;

      // Always read the latest stored model at send time —
      // avoids stale closure when model is changed from within a pushed view
      const model = await getStoredModel();

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userText.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      const history: Message[] = [SYSTEM_PROMPT, ...messages, userMsg];
      abortRef.current = new AbortController();
      let accumulated = "";

      await streamChat(
        history,
        model,
        (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        () => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: accumulated,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingContent("");
          setIsLoading(false);
        },
        (err) => {
          const errMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `**Hata:** ${err.message}`,
          };
          setMessages((prev) => [...prev, errMsg]);
          setStreamingContent("");
          setIsLoading(false);
        },
        abortRef.current.signal,
      );
    },
    [messages, isLoading],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setStreamingContent("");
  }, []);

  const clearHistory = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopStreaming,
    clearHistory,
  };
}
