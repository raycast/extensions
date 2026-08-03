import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { RANDOM_IDEA_API_URL } from "./api";
import { RandomIdeaResponse } from "./types";
import { registrationUrl } from "./urls";

function section(title: string, value: string | null): string {
  return value ? `## ${title}\n\n${value}\n` : "";
}

export default function RandomBusinessIdea() {
  const { data, isLoading, error, revalidate } = useFetch<RandomIdeaResponse>(
    RANDOM_IDEA_API_URL,
    {
      failureToastOptions: {
        title: "Couldn’t load a business idea",
        message: "Please wait a moment and try again.",
      },
    },
  );
  const idea = data?.idea;

  if (!idea) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          error
            ? "## Couldn’t load a business idea\n\nPlease wait a moment and try again."
            : ""
        }
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const audience = idea.is_b2c ? "B2C" : "B2B";
  const markdown = `# ${idea.title}

**${idea.category}** · **${idea.score.toFixed(1)}/10** · **${audience}**

${idea.summary}

${section("The Problem", idea.problem)}
${section("Suggested Solution", idea.suggested_solution)}
${section("Target Audience", idea.target_audience)}
${section("Monetization", idea.monetization_model)}
${idea.keywords.length > 0 ? `**Keywords:** ${idea.keywords.join(", ")}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Show Another Idea" onAction={revalidate} />
          <Action.OpenInBrowser
            title="Explore More Ideas"
            url={registrationUrl("random")}
          />
          <Action.CopyToClipboard title="Copy Idea" content={markdown} />
        </ActionPanel>
      }
    />
  );
}
