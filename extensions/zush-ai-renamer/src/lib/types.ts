/** What is actually sent to the model for one file. */
export type AnalysisContent =
  | { kind: "text"; text: string }
  | { kind: "document"; bytes: Uint8Array; mimeType: string }
  | { kind: "image"; bytes: Uint8Array; mimeType: string };

export type ItemStatus =
  "pending" | "analyzing" | "ready" | "applying" | "renamed" | "unsupported" | "too_large" | "failed";

export type RenameItem = {
  /** Absolute path the item currently lives at. */
  path: string;
  /** Current filename, including the extension. */
  originalName: string;
  /** Filename after a successful rename, including the extension. */
  renamedTo: string | null;
  /** Title the model returned, without an extension. */
  proposedTitle: string | null;
  status: ItemStatus;
  /** How many titles have been generated for this file. */
  generationCount: number;
  /** Human-readable reason the item is unsupported, too large or failed. */
  error: string | null;
};
