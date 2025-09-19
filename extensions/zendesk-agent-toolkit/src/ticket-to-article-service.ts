import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { zdFetch } from "./zendesk";

/**
 * Convert markdown to HTML for Zendesk articles
 */
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // First, handle code blocks to protect them from other processing
  const codeBlocks: string[] = [];
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `CODE_BLOCK_${codeBlocks.length}`;
    const code = match.replace(/```/g, "").trim();
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return placeholder;
  });

  // Headers (order matters - h3 before h2 before h1)
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");

  // Process lists more carefully to handle multiple separate lists
  // First, convert numbered lists and mark them
  html = html.replace(/^\d+\.\s+(.*)$/gm, (match, content) => `<li data-type="numbered">${content.trim()}</li>`);

  // Convert bullet lists and mark them
  html = html.replace(/^[-*]\s+(.*)$/gm, (match, content) => `<li data-type="bullet">${content.trim()}</li>`);

  // Wrap consecutive list items, handling multiple separate lists correctly
  // This regex will match all consecutive li elements globally
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, (match) => {
    // Determine the type based on the first list item in this group
    const isNumbered = match.includes('data-type="numbered"');
    // Clean up the data attributes
    const cleanMatch = match.replace(/ data-type="(numbered|bullet)"/g, "");
    return isNumbered ? `<ol>${cleanMatch}</ol>` : `<ul>${cleanMatch}</ul>`;
  });

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, "</p><p>");

  // Split into lines and wrap non-header, non-list content in paragraphs
  const lines = html.split("\n");
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Don't wrap headers, lists, or already wrapped content
    if (trimmed.match(/^<(h[1-6]|li|ol|ul|\/ol|\/ul|p|\/p)/)) {
      return trimmed;
    }

    return `<p>${trimmed}</p>`;
  });

  html = processedLines.filter((line) => line).join("");

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`CODE_BLOCK_${index}`, block);
  });

  // Clean up extra paragraph tags and spacing
  html = html
    .replace(/<p><\/p>/g, "")
    .replace(/<\/p><p>/g, "</p><p>")
    .replace(/^\s*<p>/g, "<p>")
    .replace(/<\/p>\s*$/g, "</p>")
    .trim();

  // Ensure we start and end with paragraph tags if we don't have other block elements
  if (html && !html.match(/^<(h[1-6]|ol|ul|pre)/)) {
    html = `<p>${html}</p>`;
  }

  return html;
}

interface TicketToArticlePreferences {
  openaiApiKey?: string;
  enableAIMacros?: boolean;
}

interface TicketComment {
  id: number;
  body: string;
  html_body: string;
  public: boolean;
  author_id: number;
  created_at: string;
  attachments: Array<{
    id: number;
    file_name: string;
    content_url: string;
    content_type: string;
    size: number;
    thumbnails?: Array<{
      id: number;
      file_name: string;
      content_url: string;
      content_type: string;
      size: number;
    }>;
  }>;
}

interface TicketDetails {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  custom_fields: Array<{ id: number; value: string | number | null }>;
}

interface ArticleContent {
  title: string;
  body: string;
  summary: string;
  tags: string[];
  section_id?: number;
}

export class TicketToArticleService {
  public isEnabled(): boolean {
    // Check preferences dynamically each time to handle changes
    try {
      const preferences = getPreferenceValues<TicketToArticlePreferences>();
      return !!(preferences.openaiApiKey && preferences.openaiApiKey.trim());
    } catch (error) {
      console.error("Failed to check preferences:", error);
      return false;
    }
  }

  private getApiKey(): string | null {
    try {
      const preferences = getPreferenceValues<TicketToArticlePreferences>();
      return preferences.openaiApiKey || null;
    } catch (error) {
      console.error("Failed to get API key:", error);
      return null;
    }
  }

  /**
   * Get full ticket conversation including all comments and attachments
   */
  async getTicketConversation(ticketId: number): Promise<{
    ticket: TicketDetails;
    comments: TicketComment[];
    users: Array<{ id: number; name: string; role: string; email: string }>;
  }> {
    try {
      // Get ticket details
      const ticketResponse = await zdFetch<{ ticket: TicketDetails }>(`/api/v2/tickets/${ticketId}.json`);

      // Get all comments
      const commentsResponse = await zdFetch<{ comments: TicketComment[] }>(
        `/api/v2/tickets/${ticketId}/comments.json`,
      );

      // Get users involved in the conversation
      const userIds = [
        ...new Set([
          ...commentsResponse.comments.map((c) => c.author_id),
          // Add any other user IDs from ticket if needed
        ]),
      ];

      const usersResponse = await zdFetch<{ users: Array<{ id: number; name: string; role: string; email: string }> }>(
        `/api/v2/users/show_many.json?ids=${userIds.join(",")}`,
      );

      return {
        ticket: ticketResponse.ticket,
        comments: commentsResponse.comments,
        users: usersResponse.users,
      };
    } catch (error) {
      console.error("Failed to get ticket conversation:", error);
      throw error;
    }
  }

  /**
   * Extract and format images from comments
   */
  extractImages(comments: TicketComment[]): Array<{
    url: string;
    filename: string;
    contentType: string;
    description?: string;
  }> {
    const images: Array<{
      url: string;
      filename: string;
      contentType: string;
      description?: string;
    }> = [];

    comments.forEach((comment) => {
      comment.attachments.forEach((attachment) => {
        if (attachment.content_type.startsWith("image/")) {
          images.push({
            url: attachment.content_url,
            filename: attachment.file_name,
            contentType: attachment.content_type,
            description: `Image from comment by user ${comment.author_id}`,
          });
        }
      });
    });

    return images;
  }

  /**
   * Generate article content from ticket conversation using OpenAI
   */
  async generateArticleFromTicket(ticketId: number, targetSectionId?: number): Promise<ArticleContent> {
    if (!this.isEnabled()) {
      throw new Error("OpenAI API key not configured");
    }

    const conversation = await this.getTicketConversation(ticketId);
    const images = this.extractImages(conversation.comments);

    // Format the conversation for OpenAI
    const conversationText = this.formatConversationForAI(conversation);

    const prompt = this.buildArticleGenerationPrompt(conversationText, images);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are a technical writing expert who creates clear, comprehensive support articles from customer support conversations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return this.parseArticleContent(aiResponse, conversation.ticket, targetSectionId);
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      throw new Error(`Failed to generate article: ${error}`);
    }
  }

  /**
   * Format ticket conversation for AI processing
   */
  private formatConversationForAI(conversation: {
    ticket: TicketDetails;
    comments: TicketComment[];
    users: Array<{ id: number; name: string; role: string; email: string }>;
  }): string {
    const { ticket, comments, users } = conversation;

    const userMap = new Map(users.map((u) => [u.id, u]));

    let formatted = `TICKET DETAILS:\n`;
    formatted += `Subject: ${ticket.subject}\n`;
    formatted += `Status: ${ticket.status}\n`;
    formatted += `Priority: ${ticket.priority}\n`;
    formatted += `Created: ${ticket.created_at}\n`;
    formatted += `Updated: ${ticket.updated_at}\n`;
    if (ticket.tags.length > 0) {
      formatted += `Tags: ${ticket.tags.join(", ")}\n`;
    }
    formatted += `\n`;

    formatted += "INITIAL PROBLEM DESCRIPTION:\n";
    formatted += `${ticket.description}\n\n`;

    formatted += "CONVERSATION HISTORY (chronological order):\n\n";

    comments
      .filter((comment) => comment.public) // Only include public comments
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // Sort chronologically
      .forEach((comment, index) => {
        const user = userMap.get(comment.author_id);
        const userRole = user?.role || "end_user";
        const userName = user?.name || `User ${comment.author_id}`;

        // Clean up role names for clarity
        const roleDisplay =
          userRole === "end_user" ? "CUSTOMER" : userRole === "agent" ? "SUPPORT AGENT" : userRole.toUpperCase();

        formatted += `COMMENT ${index + 1} - ${roleDisplay} (${userName}):\n`;
        formatted += `Time: ${comment.created_at}\n`;

        // Clean up the comment body - remove signature blocks and extra formatting
        const cleanBody = comment.body
          .replace(/--\s*[\s\S]*$/, "") // Remove email signatures starting with --
          .replace(/\n{3,}/g, "\n\n") // Reduce multiple newlines
          .trim();

        formatted += `Message: ${cleanBody}\n`;

        if (comment.attachments.length > 0) {
          formatted += `Attachments: ${comment.attachments.map((a) => `${a.file_name} (${a.content_type})`).join(", ")}\n`;
        }

        formatted += `\n---\n\n`;
      });

    // Add a summary section to help the AI understand the flow
    formatted += "CONVERSATION SUMMARY:\n";
    formatted += "Please analyze this conversation to understand:\n";
    formatted += "1. What was the original problem the customer reported?\n";
    formatted += "2. What troubleshooting steps were suggested by support?\n";
    formatted += "3. Which steps actually worked to resolve the issue?\n";
    formatted += "4. How did the customer confirm the problem was fixed?\n\n";

    return formatted;
  }

  /**
   * Build the prompt for OpenAI article generation
   */
  private buildArticleGenerationPrompt(
    conversationText: string,
    images: Array<{ url: string; filename: string }>,
  ): string {
    let prompt = `You are creating a help center article from a REAL support ticket conversation. You must analyze the EXACT conversation provided and create an article that accurately reflects what happened.

SUPPORT TICKET CONVERSATION:
${conversationText}

`;

    if (images.length > 0) {
      prompt += `IMAGES/ATTACHMENTS: ${images.map((img) => img.filename).join(", ")}\n\n`;
    }

    prompt += `CRITICAL INSTRUCTIONS:
- You MUST base the article ONLY on what actually happened in this conversation
- Do NOT make up or assume information that isn't in the conversation
- Focus on the EXACT problem described and the EXACT solution that worked
- Use the ACTUAL steps that were tried and succeeded
- Include the specific software/app/platform mentioned
- Write in GENERIC, INSTRUCTIONAL language - do NOT reference "the user" or "customer"
- Make it a reusable troubleshooting guide that anyone can follow

Please provide a response in the following JSON format:
{
  "title": "Clear, descriptive title that matches the actual problem solved",
  "summary": "Brief summary of the specific issue and solution",
  "body": "Complete article content in markdown format with generic instructions",
  "tags": ["relevant", "tags", "from", "actual", "conversation"],
  "category": "troubleshooting"
}

REQUIRED ARTICLE STRUCTURE (use EXACTLY these headers):
# [Problem Title]

## Problem
[Describe the issue in generic terms - what goes wrong, what doesn't work]

## Solution
1. [First troubleshooting step to try]
2. [Second step if first doesn't work]
3. [Final step if needed]

WRITING STYLE REQUIREMENTS:
- Use imperative language: "Log out of the app" not "The user logged out"
- Write instructions anyone can follow: "If you experience..." not "If the user experienced..."
- Focus on the technical solution, not the story of what happened
- Be concise and actionable
- Only include steps that actually worked in the conversation

EXAMPLE (GOOD):
# Box App Not Syncing on Mobile Device

## Problem
The Box mobile app stops syncing files and won't upload new content like photos or documents.

## Solution
1. Log out of the Box app and sign back in
2. If the issue persists, check for and install any pending device updates
3. If the problem continues, delete and reinstall the Box app

EXAMPLE (BAD - don't do this):
# Box App Syncing Issues

## Problem
The user reported that their Box app wasn't working and they couldn't upload inspection photos.

## Solution
The user tried logging out and back in, which worked for them.

Remember: Create a generic troubleshooting guide that any future person with this problem can follow.`;

    return prompt;
  }

  /**
   * Parse AI response into structured article content
   */
  private parseArticleContent(aiResponse: string, ticket: TicketDetails, targetSectionId?: number): ArticleContent {
    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let jsonText = jsonMatch ? jsonMatch[0] : aiResponse.trim();

      // If the entire response looks like JSON, use it directly
      if (aiResponse.trim().startsWith("{") && aiResponse.trim().endsWith("}")) {
        jsonText = aiResponse.trim();
      }

      console.log("Attempting to parse JSON:", jsonText);
      const parsed = JSON.parse(jsonText);

      // Validate that we have the required fields
      if (!parsed.title || !parsed.body) {
        throw new Error("Missing required fields in AI response");
      }

      // Clean up the title - remove any JSON artifacts
      const cleanTitle = parsed.title.replace(/^[{["\s]+|[}]"\s]+$/g, "").trim();

      // Clean up the body - ensure it's properly formatted markdown
      let cleanBody = parsed.body;
      if (typeof cleanBody === "string") {
        // Remove any JSON wrapper artifacts
        cleanBody = cleanBody.replace(/^[{["\s]+|[}]"\s]+$/g, "").trim();

        // Fix markdown formatting issues
        cleanBody = cleanBody
          // Add double newlines before headers
          .replace(/(\n|^)(#{1,6}\s)/g, "\n\n$2")
          // Add double newlines after headers
          .replace(/(#{1,6}\s[^\n]+)(\n)(?!\n)/g, "$1\n\n")
          // Ensure proper spacing around numbered lists
          .replace(/(\n|^)(\d+\.\s)/g, "\n\n$2")
          // Ensure proper spacing around bullet points
          .replace(/(\n|^)([-*]\s)/g, "\n\n$2")
          // Fix multiple consecutive newlines
          .replace(/\n{3,}/g, "\n\n")
          // Remove leading/trailing whitespace
          .trim();

        // Ensure proper markdown formatting
        if (!cleanBody.startsWith("#")) {
          cleanBody = `# ${cleanTitle}\n\n${cleanBody}`;
        }
      }

      return {
        title: cleanTitle,
        body: cleanBody,
        summary: parsed.summary || `Troubleshooting guide for: ${cleanTitle}`,
        tags: [
          ...(Array.isArray(parsed.tags) ? parsed.tags : []),
          `ticket-${ticket.id}`,
          parsed.category || "troubleshooting",
        ].filter(Boolean),
        section_id: targetSectionId,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw AI response:", aiResponse);

      // Try to extract the content manually if JSON parsing fails
      try {
        // Look for title in the response
        const titleMatch = aiResponse.match(/"title":\s*"([^"]+)"/);
        const bodyMatch = aiResponse.match(/"body":\s*"([\s\S]*?)"\s*,\s*"tags"/);
        const summaryMatch = aiResponse.match(/"summary":\s*"([^"]+)"/);

        if (titleMatch && bodyMatch) {
          let extractedBody = bodyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\r/g, "").trim();

          // Apply the same formatting fixes as above
          extractedBody = extractedBody
            .replace(/(\n|^)(#{1,6}\s)/g, "\n\n$2")
            .replace(/(#{1,6}\s[^\n]+)(\n)(?!\n)/g, "$1\n\n")
            .replace(/(\n|^)(\d+\.\s)/g, "\n\n$2")
            .replace(/(\n|^)([-*]\s)/g, "\n\n$2")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          return {
            title: titleMatch[1],
            body: extractedBody,
            summary: summaryMatch ? summaryMatch[1] : `Troubleshooting guide for: ${titleMatch[1]}`,
            tags: [`ticket-${ticket.id}`, "troubleshooting", "manual-extraction"],
            section_id: targetSectionId,
          };
        }
      } catch (extractError) {
        console.error("Manual extraction also failed:", extractError);
      }

      // Final fallback: use ticket info
      return {
        title: ticket.subject,
        body: `# ${ticket.subject}\n\n*This article could not be generated automatically. Please create the content manually based on ticket #${ticket.id}.*\n\nOriginal AI Response:\n\`\`\`\n${aiResponse}\n\`\`\``,
        summary: `Manual article needed for: ${ticket.subject}`,
        tags: [`ticket-${ticket.id}`, "troubleshooting", "needs-manual-creation"],
        section_id: targetSectionId,
      };
    }
  }

  /**
   * Get available permission groups
   */
  async getPermissionGroups(): Promise<Array<{ id: number; name: string; built_in: boolean }>> {
    try {
      const response = await zdFetch<{ permission_groups: Array<{ id: number; name: string; built_in: boolean }> }>(
        "/api/v2/guide/permission_groups.json",
      );
      return response.permission_groups;
    } catch (error) {
      console.error("Failed to get permission groups:", error);
      // Return default if can't fetch
      return [{ id: 1, name: "Everyone", built_in: true }];
    }
  }

  /**
   * Create the article in Zendesk Help Center
   */
  async createArticleInHelpCenter(
    articleContent: ArticleContent,
  ): Promise<{ article: { id: number; html_url: string; title: string } }> {
    try {
      if (!articleContent.section_id) {
        throw new Error("Section ID is required to create an article");
      }

      // Get permission groups and use the first one (usually "Everyone")
      const permissionGroups = await this.getPermissionGroups();
      const defaultPermissionGroup = permissionGroups.find((pg) => pg.built_in) || permissionGroups[0];

      if (!defaultPermissionGroup) {
        throw new Error("No permission groups available");
      }

      const articleData = {
        article: {
          title: articleContent.title,
          body: convertMarkdownToHtml(articleContent.body),
          locale: "en-us",
          draft: true, // Start as draft for review
          permission_group_id: defaultPermissionGroup.id,
          user_segment_id: null, // Make visible to everyone
        },
      };

      const response = await zdFetch<{ article: { id: number; html_url: string; title: string } }>(
        `/api/v2/help_center/sections/${articleContent.section_id}/articles.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(articleData),
        },
      );

      return response;
    } catch (error) {
      console.error("Failed to create article:", error);
      throw error;
    }
  }

  /**
   * Complete workflow: convert ticket to article
   */
  async convertTicketToArticle(
    ticketId: number,
    targetSectionId?: number,
  ): Promise<{ article: { id: number; html_url: string; title: string } }> {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Analyzing ticket...",
        message: "Extracting conversation and generating article content",
      });

      const articleContent = await this.generateArticleFromTicket(ticketId, targetSectionId);

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating article...",
        message: `"${articleContent.title}"`,
      });

      const result = await this.createArticleInHelpCenter(articleContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Article created successfully!",
        message: `"${result.article.title}" is ready for review`,
      });

      return result;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create article",
        message: String(error),
      });
      throw error;
    }
  }
}

export const ticketToArticleService = new TicketToArticleService();
