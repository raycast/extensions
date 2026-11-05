import { getDocument } from "../src/lib/transport";
import { parseFeed } from "../src/lib/source";
import { RSS_URL } from "../src/lib/model";

async function main() {
  const response = await getDocument(RSS_URL);
  if (response.status !== "ok") throw new Error("Expected an HTML response");
  const entries = parseFeed(response.body, new Date().toISOString());
  console.table(
    entries.map((b) => ({
      title: b.title,
      cves: b.cves.length,
      coverage: b.completeness,
      promptCharacters: b.assessmentPrompt?.length ?? 0,
      provenance: b.provenance,
    })),
  );
  if (entries.some((b) => b.completeness !== "full"))
    throw new Error("Only partial records were recovered. Full record and prompt verification remains incomplete.");
  console.log(`Retrieved ${entries.length} complete records. Confirm this again inside Raycast before release.`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Source verification failed");
  process.exitCode = 1;
});
