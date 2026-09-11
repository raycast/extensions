import { fetchAccountSnapshot, formatAccountSnapshotForAI, getErrorMessage } from "../zenmux";

type Input = {
  /**
   * Optional context about what the user wants to know. Use this to tailor the returned account summary when available.
   */
  question?: string;
};

/**
 * Get the user's current ZenMux account status, subscription quota, PAYG balance, Flow rate, and useful ZenMux links.
 */
export default async function getZenMuxAccount(input: Input = {}) {
  try {
    const snapshot = await fetchAccountSnapshot();

    return [
      input.question ? `User question: ${input.question}` : undefined,
      "Current ZenMux account data:",
      formatAccountSnapshotForAI(snapshot),
      "",
      "Official links:",
      "- ZenMux homepage: https://zenmux.ai/",
      "- ZenMux docs: https://docs.zenmux.ai/",
      "- Quick start: https://docs.zenmux.ai/guide/quickstart",
      "- Platform API console: https://zenmux.ai/platform/management",
      "- Request logs console: https://zenmux.ai/platform/logs",
      "",
      "Notes:",
      "- The Platform API key itself is never returned by this tool.",
      "- Platform API keys are only for account and usage management endpoints. Do not use them for model or coding tool integrations.",
      "- Monthly quota currently exposes cap values only, not real-time monthly usage.",
      "- 5-hour and 7-day quota are rolling windows with real-time usage and reset times.",
    ]
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    return [
      "Could not fetch the current ZenMux account data.",
      `Error: ${getErrorMessage(error)}`,
      "",
      "Useful links:",
      "- Platform API console: https://zenmux.ai/platform/management",
      "- ZenMux docs: https://docs.zenmux.ai/",
      "- Quick start: https://docs.zenmux.ai/guide/quickstart",
    ].join("\n");
  }
}
