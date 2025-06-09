import { Workflow, Node } from "../types/types"; // Assuming Node type is defined in types.ts

// Define a more specific type for webhook node parameters if possible
// Based on the example provided:
interface WebhookNodeParams {
  httpMethod?: string;
  path?: string;
  options?: Record<string, unknown>;
  // Add other potential webhook parameters if known
}

interface WebhookDetails {
  method: string;
  path: string;
  nodeId: string; // Include node ID for reference if needed
}

// Valid HTTP methods according to RFC 7231 and common extensions
const VALID_HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT", "TRACE"];

/**
 * Checks if a workflow contains a webhook trigger node and returns its details.
 * Currently assumes the first node of type 'n8n-nodes-base.webhook' is the trigger.
 * @param workflow The workflow object to check.
 * @returns WebhookDetails object if found, otherwise null.
 */
export function getWebhookDetails(workflow: Workflow): WebhookDetails | null {
  if (!workflow || !Array.isArray(workflow.nodes)) {
    return null;
  }

  const webhookNode = workflow.nodes.find((node: Node) => node.type === "n8n-nodes-base.webhook");

  if (webhookNode) {
    const params = webhookNode.parameters as WebhookNodeParams;

    // Normalize and validate method
    let method = params.httpMethod?.trim().toUpperCase() || "";
    const path = params.path?.trim() || "";

    // Validate method is a standard HTTP method
    if (method && !VALID_HTTP_METHODS.includes(method)) {
      // Default to GET if invalid method provided
      method = "GET";
    }

    // Ensure both method and path exist
    if (method && path) {
      return {
        method: method,
        path: path,
        nodeId: webhookNode.id || "unknown", // Use node ID if available
      };
    }
  }

  return null;
}
