import { BriefingTools } from "../lib/ai-tools";
import { service } from "../lib/runtime";

type Input = {
  /** Canonical briefing URL or source slug returned by search-briefings. A CVE identifies a search, not a briefing. */
  briefingId: string;
};

/** Retrieve a full Zero Wire briefing, including qualified source guidance, evidence, chronology, coverage and the exact available assessment prompt. Does not mark reviewed, copy, execute prompts, or inspect infrastructure. */
export default async function tool(input: Input) {
  return new BriefingTools(service).get(input);
}
