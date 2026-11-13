import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConfigurationError, TokenUsage, resolveSettings } from "./config";

export interface AIUpdate {
  text?: string;
  usage?: TokenUsage;
}

export async function streamAnswer({
  settings,
  apiKey,
  prompt,
  input,
  signal,
  onUpdate,
}: {
  settings: ReturnType<typeof resolveSettings>;
  apiKey: string;
  prompt: string;
  input: string;
  signal: AbortSignal;
  onUpdate: (update: AIUpdate) => void;
}) {
  if (!apiKey.trim())
    throw new ConfigurationError("Set the API key for your selected AI provider in extension settings.");
  if (!prompt.trim()) throw new ConfigurationError("The selected Gist prompt is empty. Select a nonempty prompt.");
  if (!input.trim()) throw new ConfigurationError("Select or enter some text before asking AI.");
  const options = { apiKey: apiKey.trim(), baseURL: settings.baseURL, maxRetries: 0, timeout: 120_000 };
  let text = "";
  let finishReason: string | null = null;

  if (settings.provider === "anthropic") {
    const client = new Anthropic(options);
    const stream = await client.messages.create(
      {
        model: settings.model,
        system: prompt,
        messages: [{ role: "user", content: input }],
        max_tokens: 16384,
        stream: true,
      },
      { signal },
    );
    let inputTokens = 0;
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "text") {
        text += event.content_block.text;
        onUpdate({ text });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        onUpdate({ text });
      } else if (event.type === "message_start") {
        const usage = event.message.usage;
        inputTokens =
          usage.input_tokens + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
      } else if (event.type === "message_delta") {
        finishReason = event.delta.stop_reason ?? finishReason;
        onUpdate({ usage: { inputTokens, outputTokens: event.usage.output_tokens } });
      }
    }
  } else {
    const client = new OpenAI(options);
    const stream = await client.chat.completions.create(
      {
        model: settings.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: input },
        ],
        stream: true,
        // Custom servers may not implement streaming usage.
        ...(settings.provider !== "custom" ? { stream_options: { include_usage: true } } : {}),
      },
      { signal },
    );
    for await (const part of stream) {
      const choice = part.choices[0];
      if (choice?.delta.content) {
        text += choice.delta.content;
        onUpdate({ text });
      }
      if (choice?.delta.refusal) {
        text += choice.delta.refusal;
        onUpdate({ text });
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (part.usage) {
        onUpdate({ usage: { inputTokens: part.usage.prompt_tokens, outputTokens: part.usage.completion_tokens } });
      }
    }
  }

  if (signal.aborted) return;
  if (!text.trim()) {
    throw new ConfigurationError("The service returned no text. Try another model or revise the prompt.");
  }
  if (!finishReason) {
    throw new ConfigurationError("The response ended before completion. You can retry with the same text and prompt.");
  }
  if (finishReason === "length" || finishReason === "max_tokens") {
    throw new ConfigurationError("The response reached the output limit. Ask for a shorter answer or retry.");
  }
  if (finishReason === "content_filter") {
    throw new ConfigurationError("The service filtered part of the response. Revise the input or prompt.");
  }
}
