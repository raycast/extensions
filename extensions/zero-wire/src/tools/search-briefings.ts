import { BriefingTools } from "../lib/ai-tools";
import { service } from "../lib/runtime";

type Input = {
  /** Search title, all CVEs, and technology tags using identifying keywords rather than descriptive user phrases. Use an empty string to browse. Matching ignores case and CVE punctuation. */
  query?: string;
  /** Combine the query with this filter. Defaults to all categories, including Reference. Following and unread use local user state. */
  filter?: "all" | "attention" | "reference" | "following" | "unread";
  /** Restrict results to local bookmarks, retaining metadata for saved entries absent from the current feed. */
  savedOnly?: boolean;
  /** Page size from 1 to 100. Defaults to 20. */
  limit?: number;
  /** Zero-based offset. Use nextOffset from a previous result for the same query and filters. */
  offset?: number;
};

/** Search curated Cloudflare Zero Wire briefings. Returns source URLs, source dates, freshness and local review state. Never determines infrastructure exposure. */
export default async function tool(input: Input) {
  return new BriefingTools(service).search(input);
}
