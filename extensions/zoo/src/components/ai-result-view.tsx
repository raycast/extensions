// src/components/ai-result-view.tsx
import { Action, ActionPanel, Detail, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { global_model, openai } from "./api";
import { countToken, estimatePrice } from "./util";

interface AIResultViewProps {
  content: string;
}

export function AIResultView({ content }: AIResultViewProps) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [responseTokenCount, setResponseTokenCount] = useState(0);
  const [promptTokenCount, setPromptTokenCount] = useState(0);

  useEffect(() => {
    async function analyzeContent() {
      try {
        const selectedText = await getSelectedText();
        if (!selectedText && !content) {
          setResponse("No content selected to analyze.");
          setLoading(false);
          return;
        }
        const prompt = content || "You are a helpful assistant that analyzes and explains the provided content.";
        const stream = await openai.chat.completions.create({
          model: global_model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: selectedText || "" },
          ],
          stream: true,
        });

        setPromptTokenCount(countToken(prompt + content));

        let fullResponse = "";
        for await (const part of stream) {
          const message = part.choices[0].delta.content;
          if (message) {
            fullResponse += message;
            setResponse(fullResponse);
            setResponseTokenCount(countToken(fullResponse));
          }
        }
        setLoading(false);
      } catch (error) {
        setResponse(`Error analyzing content: ${error}`);
        setLoading(false);
      }
    }

    analyzeContent();
  }, [content]);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Analysis" content={response} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={global_model} />
          <Detail.Metadata.Label title="Prompt Tokens" text={String(promptTokenCount)} />
          <Detail.Metadata.Label title="Response Tokens" text={String(responseTokenCount)} />
          <Detail.Metadata.Label
            title="Estimated Cost"
            text={`${estimatePrice(promptTokenCount, responseTokenCount, global_model)} cents`}
          />
        </Detail.Metadata>
      }
    />
  );
}
