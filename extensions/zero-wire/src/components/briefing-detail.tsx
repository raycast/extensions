import { useEffect } from "react";
import { Detail } from "@raycast/api";
import { type Briefing, categoryName, isUnread } from "../lib/model";
import { briefingMarkdown, escapeMarkdown } from "../lib/markdown";
import { useZeroWire } from "../lib/use-zero-wire";
import { BriefingActions } from "./briefing-actions";

export function BriefingDetail({ briefing }: { briefing: Briefing }) {
  const store = useZeroWire();
  const b = store.db?.archive[briefing.id] ?? briefing;
  useEffect(() => {
    if (briefing.completeness !== "full") void store.loadDetail(briefing);
  }, [briefing.id]);
  const available = store.db?.snapshot?.briefings.some((item) => item.id === b.id);
  const banner = [
    store.error,
    available === false
      ? "This saved briefing is absent from the latest feed. Current source availability is unknown."
      : null,
  ]
    .filter(Boolean)
    .map((message) => `> ${escapeMarkdown(message ?? "")}\n\n`)
    .join("");
  return (
    <Detail
      navigationTitle={b.title}
      isLoading={store.loading}
      markdown={banner + briefingMarkdown(b)}
      actions={<BriefingActions briefing={b} detail />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Source category" text={categoryName(b.category)} />
          <Detail.Metadata.Label title="Recommended action" text={b.action} />
          <Detail.Metadata.Label
            title="Local review"
            text={store.db && !isUnread(b, store.db) ? "Reviewed revision" : "Unread revision"}
          />
          <Detail.Metadata.Label title="RSS item date" text={b.sourceUpdatedAt ?? "Unknown"} />
          <Detail.Metadata.Label title="Source last checked" text={b.lastChecked ?? "Unknown"} />
          <Detail.Metadata.Label title="Retrieved locally" text={new Date(b.fetchedAt).toLocaleString()} />
          <Detail.Metadata.Label
            title="Content coverage"
            text={b.completeness === "full" ? "Full RSS entry" : "Partial source content"}
          />
          <Detail.Metadata.Link title="Source" text="Cloudflare Zero Wire" target={b.url} />
          <Detail.Metadata.TagList title="CVEs">
            {b.cves.map((cve) => (
              <Detail.Metadata.TagList.Item key={cve} text={cve} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Technologies">
            {b.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
