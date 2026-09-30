import { open, getPreferenceValues } from "@raycast/api";
import { Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  enableDraftPreviews: boolean;
}

/**
 * Input parameters for the draft-email tool
 * This tool is specifically for creating a new email draft with provided information,
 * NOT for searching emails. It assumes you already have the recipient information.
 * If the email contains markdown links, they will be converted to plain text and you must then convert to rich media.
 */
type Input = {
  /**
   * The email address of the recipient (or multiple recipients separated by commas)
   */
  recipient?: string;

  /**
   * Comma-separated list of CC recipients
   * Example: "person1@example.com, person2@example.com"
   */
  cc?: string;

  /**
   * Comma-separated list of BCC recipients
   * Example: "person1@example.com, person2@example.com"
   */
  bcc?: string;

  /**
   * The subject line of the email
   */
  subject?: string;

  /**
   * The body content of the email
   */
  body?: string;
};

/**
 * Optional confirmation before creating an email draft
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { enableDraftPreviews } = getPreferenceValues<Preferences>();

  // If draft previews are disabled, skip confirmation
  if (!enableDraftPreviews) {
    return undefined;
  }

  let message = "Create email draft";
  const image = "✉️";

  if (input.recipient) {
    message += ` to: ${input.recipient}`;
  }

  if (input.subject) {
    message += `\nSubject: ${input.subject}`;
  }

  // Create email preview content for confirmation dialog
  const info = [];

  if (input.recipient) {
    info.push({ name: "To", value: input.recipient });
  }

  if (input.cc) {
    info.push({ name: "CC", value: input.cc });
  }

  if (input.bcc) {
    info.push({ name: "BCC", value: input.bcc });
  }

  if (input.subject) {
    info.push({ name: "Subject", value: input.subject });
  }

  if (input.body) {
    info.push({ name: "Body", value: input.body });
  }

  return {
    message,
    image,
    info,
  };
};

/**
 * Converts Markdown links to plain URLs to ensure they work in email clients
 * @param text The text that may contain Markdown links
 * @returns Text with Markdown links converted to plain URLs
 */
function convertMarkdownLinksToPlainText(text: string): string {
  if (!text) return text;

  // Replace Markdown links [text](url) with formatted text (handles URL parameters better)
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Make sure we don't lose any URL parameters by keeping the URL intact
    return `${linkText}: ${url}`;
  });
}

/**
 * Creates a new email draft using standard mailto: format.
 * This tool should be used for composing emails when you have recipient information,
 * not for searching emails.
 * At least one parameter (recipient, subject, body, cc, or bcc) is required.
 */
export default async function tool(input: Input): Promise<string> {
  try {
    console.log(`Creating email draft in zero`);
    console.log("Input parameters received:", JSON.stringify(input, null, 2));

    // Convert any Markdown links to plain text
    if (input.body) {
      const originalBody = input.body;
      input.body = convertMarkdownLinksToPlainText(input.body);

      if (originalBody !== input.body) {
        console.log("Converted Markdown links to plain text in email body");
        console.log("Original body:", originalBody);
        console.log("Converted body:", input.body);
      }
    }

    let url = "mailto:";
    const params: string[] = [];

    // Add recipient directly after mailto:
    if (input.recipient) {
      url += encodeURIComponent(input.recipient);
    }

    if (input.cc) params.push(`cc=${encodeURIComponent(input.cc)}`);
    if (input.bcc) params.push(`bcc=${encodeURIComponent(input.bcc)}`);
    if (input.subject)
      params.push(`subject=${encodeURIComponent(input.subject)}`);
    if (input.body) params.push(`body=${encodeURIComponent(input.body)}`);

    // Add debug information for URL construction
    console.log("URL being constructed:");
    console.log(
      "Base URL:",
      "mailto:" + (input.recipient ? encodeURIComponent(input.recipient) : ""),
    );
    console.log("Parameters:", params);

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    console.log(`Final URL: ${url}`);

    // Fall back to a default email if nothing is provided
    if (url === "mailto:") {
      console.log(
        "WARNING: No email parameters provided, using default email app behavior",
      );
    }

    await open(url);

    // Create a more informative success message including CC/BCC if provided
    let successMessage = "Email draft created successfully";

    if (input.recipient) {
      successMessage += ` for ${input.recipient}`;
    }

    if (input.cc) {
      successMessage += `, CC: ${input.cc}`;
    }

    if (input.bcc) {
      successMessage += `, BCC: ${input.bcc}`;
    }

    return successMessage;
  } catch (error) {
    console.error("Failed to create email draft:", error);
    showFailureToast(error, { title: "Failed to create email draft" });
    return "Failed to create email draft";
  }
}
