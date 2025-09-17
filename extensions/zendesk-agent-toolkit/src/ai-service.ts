import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MacroAction } from "./zendesk";

interface AIPreferences {
  openaiApiKey?: string;
  enableAIMacros?: boolean;
}

interface TicketAnalysis {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority?: string;
  resolution_comment?: string;
  tags?: string[];
  custom_fields?: Array<{ id: number; value: string | number | null }>;
  created_at: string;
  solved_at?: string;
  assignee_actions: Array<{
    field: string;
    from_value: string | number | boolean | null;
    to_value: string | number | boolean | null;
    timestamp: string;
  }>;
}

interface MacroSuggestion {
  title: string;
  description: string;
  actions: MacroAction[];
  confidence: number;
  reasoning: string;
  pattern_match: string;
  similar_tickets: number[];
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class AIService {
  private apiKey: string | null = null;
  private baseUrl = "https://api.openai.com/v1/chat/completions";

  constructor() {
    this.initializeApiKey();
  }

  private initializeApiKey() {
    try {
      const preferences = getPreferenceValues<AIPreferences>();
      this.apiKey = preferences.openaiApiKey || null;
    } catch (error) {
      console.error("Failed to load OpenAI API key:", error);
    }
  }

  public isEnabled(): boolean {
    try {
      const preferences = getPreferenceValues<AIPreferences>();
      return Boolean(preferences.enableAIMacros && this.apiKey);
    } catch {
      return false;
    }
  }

  public async analyzeTicketForMacro(
    resolvedTicket: TicketAnalysis,
    similarTickets: TicketAnalysis[] = [],
  ): Promise<MacroSuggestion | null> {
    if (!this.isEnabled() || !this.apiKey) {
      return null;
    }

    try {
      const prompt = this.buildAnalysisPrompt(resolvedTicket, similarTickets);
      const response = await this.callOpenAI(prompt);
      return this.parseMacroSuggestion(response);
    } catch (error) {
      console.error("AI analysis failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Analysis Failed",
        message: "Could not generate macro suggestion",
      });
      return null;
    }
  }

  private buildAnalysisPrompt(resolvedTicket: TicketAnalysis, similarTickets: TicketAnalysis[]): string {
    const actionsSequence = resolvedTicket.assignee_actions
      .map((action) => `${action.field}: ${action.from_value} → ${action.to_value}`)
      .join(", ");

    const similarTicketsContext =
      similarTickets.length > 0
        ? `\n\nSimilar tickets resolved:\n${similarTickets
            .map(
              (t) =>
                `- #${t.id}: "${t.subject}" (${t.status}, resolution: "${t.resolution_comment?.substring(0, 100)}...")`,
            )
            .join("\n")}`
        : "";

    return `You are an expert Zendesk automation consultant. Analyze this resolved ticket and determine if it represents a pattern that could be automated with a macro.

RESOLVED TICKET:
- ID: #${resolvedTicket.id}
- Subject: "${resolvedTicket.subject}"
- Description: "${resolvedTicket.description?.substring(0, 300)}..."
- Priority: ${resolvedTicket.priority || "normal"}
- Actions taken: ${actionsSequence}
- Resolution comment: "${resolvedTicket.resolution_comment?.substring(0, 200)}..."
- Tags: ${resolvedTicket.tags?.join(", ") || "none"}
- Time to resolve: ${this.calculateResolutionTime(resolvedTicket.created_at, resolvedTicket.solved_at)}
${similarTicketsContext}

ANALYSIS CRITERIA:
1. Is this a repeatable pattern that agents encounter regularly?
2. Are the resolution steps standardizable?
3. Would automation save significant time?
4. Is the confidence level high enough (>0.7) to suggest a macro?

If this ticket represents a good automation opportunity, provide a JSON response with this structure:
{
  "should_create_macro": true,
  "confidence": 0.85,
  "title": "Descriptive macro name",
  "description": "Brief description of when to use this macro",
  "actions": [
    {"field": "priority", "value": "high"},
    {"field": "comment", "value": "Standard response text"},
    {"field": "status", "value": "solved"}
  ],
  "reasoning": "Why this would make a good macro",
  "pattern_match": "What pattern this represents",
  "estimated_time_savings": "How much time this could save"
}

If this ticket should NOT become a macro, respond with:
{
  "should_create_macro": false,
  "reasoning": "Why this isn't suitable for automation"
}

Focus on common support patterns like password resets, account issues, billing questions, technical troubleshooting, etc.`;
  }

  private calculateResolutionTime(created: string, solved?: string): string {
    if (!solved) return "unknown";

    const createdTime = new Date(created);
    const solvedTime = new Date(solved);
    const diffMs = solvedTime.getTime() - createdTime.getTime();
    const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return `${diffMinutes} minutes`;
    }

    return `${diffHours} hours`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // More cost-effective for this use case
        messages: [
          {
            role: "system",
            content:
              "You are an expert Zendesk automation consultant who helps create efficient macros from ticket patterns. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, structured outputs
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return data.choices[0]?.message?.content || "";
  }

  private parseMacroSuggestion(aiResponse: string): MacroSuggestion | null {
    try {
      // Clean up the response in case it has markdown formatting
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanedResponse);

      if (!parsed.should_create_macro) {
        return null;
      }

      return {
        title: parsed.title,
        description: parsed.description,
        actions: parsed.actions || [],
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || "",
        pattern_match: parsed.pattern_match || "",
        similar_tickets: [], // Will be populated by the caller
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("AI Response:", aiResponse);
      return null;
    }
  }

  public async findSimilarTickets(
    ticket: TicketAnalysis,
    allResolvedTickets: TicketAnalysis[],
  ): Promise<TicketAnalysis[]> {
    if (!this.isEnabled() || allResolvedTickets.length === 0) {
      return [];
    }

    // Simple similarity matching based on keywords and patterns
    const ticketWords = this.extractKeywords(ticket.subject + " " + ticket.description);

    const similarities = allResolvedTickets
      .filter((t) => t.id !== ticket.id)
      .map((t) => {
        const candidateWords = this.extractKeywords(t.subject + " " + t.description);
        const similarity = this.calculateSimilarity(ticketWords, candidateWords);
        return { ticket: t, similarity };
      })
      .filter((item) => item.similarity > 0.3) // Only include reasonably similar tickets
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Top 3 most similar

    return similarities.map((item) => item.ticket);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with more sophisticated NLP
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "cannot",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  private calculateSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

export const aiService = new AIService();
export type { TicketAnalysis, MacroSuggestion };
