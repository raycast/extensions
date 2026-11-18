<div align="center">
    <br/>
    <br/>
    <img src="./media/extension_icon.png" alt="Zero Wire" width="100"/>
    <h3>Zero Wire</h3>
    <p>Read and follow Cloudflare security briefings</p>
    <br/>
    <br/>
</div>

Zero Wire is an independent Raycast extension for [Cloudflare Zero Wire](https://radar.cloudflare.com/security/zero-wire). Search security briefings, read source guidance, bookmark entries, follow technology tags, and keep track of the revisions you have reviewed.

## Commands

- **Search Security Briefings** searches titles, every associated CVE, and source tags locally. The default filter is Needs attention. All, Reference, Following, and Unread are also available.
- **Saved Briefings** includes bookmarked Reference entries and retains saved metadata when an entry disappears from the feed.
- **Follow Technologies** manages source tags. A match indicates relevance and requires a separate exposure assessment.

Read a briefing with Return. Use the action panel to open its original page or an evidence link, bookmark it, mark the displayed revision reviewed, copy CVEs or an attributed Markdown brief, and copy the exact source assessment prompt when available. Opening a detail view leaves review state unchanged. Copying a prompt only puts text on your clipboard.

A meaningful source revision becomes unread again. Source last-checked dates, retrieval time, and whitespace alone do not change review state. Reference is Cloudflare's category and does not establish patch status.

## Raycast AI

Mention `@zero-wire` in Raycast AI to search briefings and retrieve source guidance. These tools use the same RSS cache as the native commands and preserve local bookmarks, followed tags, and review state.

- **search-briefings** searches titles, CVEs, and tags across all source categories by default. It also supports saved, following, and unread filters, plus pagination.
- **get-briefing** retrieves full guidance, CVE-specific qualifications, chronology, coverage, evidence, and the exact source assessment prompt when available. Use a canonical URL or slug from search results.

Try `@zero-wire Find briefings for CVE-2026-115560` or `@zero-wire Show my unread saved briefings`.

Results include canonical links, source dates, local retrieval time, content coverage, feed freshness, and fetch errors. Archived entries explicitly report unknown current source availability. The tools do not execute assessment prompts or inspect infrastructure. The native commands remain usable without an AI subscription.

## Data access and privacy

Native commands and AI tools share a persistent RSS cache. The adapter allows at most one feed request per hour per extension support directory, including manual refresh, failed attempts, partial-detail requests, and adapter upgrades. This interval is a project choice. Concurrent commands share a file lock, and the attempt time is saved before the request. Requests have a 15-second timeout and a 5 MiB response limit. Search and filter changes make no requests. Detail views use RSS content; partial entries link to the original briefing instead of scraping its page. Refresh returns cached content until another request is eligible.

The XML validator rejects malformed feeds and DTD/entity declarations. Cheerio reads RSS and embedded HTML as inert data. Heading-based extraction preserves guidance, chronology, evidence descriptions, and assessment prompt whitespace. Remote scripts and markup never execute. The canonical briefing URL is its stable identity; RSS GUIDs contain revision dates and are not used as bookmark keys. Category domains provide stable tag identifiers. Dates retain their source meaning, with RSS item dates distinct from last-checked and local retrieval times.

Conditional requests use server validators when supplied. A 304 advances the successful check time without changing content retrieval dates. Server Retry-After cooldowns apply to manual refresh too. Other failures use exponential backoff for automatic refresh on command launch. Manual retry can bypass that backoff after the one-hour interval, but cannot bypass a server cooldown. Failed requests and parser errors retain the last valid snapshot.

Source content, bookmarks, followed tags, and reviewed hashes stay in a private JSON file under Raycast's extension support directory. Atomic file replacement and shared file locks protect overlapping commands. No analytics, hosted backend, vendor-advisory crawling, infrastructure inspection, or Cloudflare account changes are included.

## Source terms and refresh policy

Checked on 5 November 2026, Asia/Kolkata:

- Cloudflare's [Zero Wire announcement](https://developers.cloudflare.com/changelog/post/2026-11-03-radar-zero-wire/) explicitly offers the [RSS feed](https://radar.cloudflare.com/security/zero-wire/rss) for following briefings and updates. It specifies no numeric polling interval or separate RSS reuse license.
- [Radar's licensing policy](https://radar.cloudflare.com/about#licensing-policies) licenses API and direct-download data under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). We treat RSS as direct-download data under that policy. This is an interpretation of the general policy, not an RSS-specific confirmation. The graph/image license and permission for limited excerpts of Radar Reports are separate grants. Ask radar@cloudflare.com about unclear uses or exceptions.
- CC BY-NC 4.0 permits noncommercial sharing and adaptation with credit, a license link, and an indication of changes. Briefing views, Markdown exports, and AI results identify Cloudflare, link the source and license, and disclose extraction and reformatting. Preserve these notices when sharing. Commercial reuse needs separate permission or another applicable legal basis. The extension's MIT license covers its code, not Cloudflare's content or trademarks.
- Cloudflare's [Website and Online Services Terms of Use](https://www.cloudflare.com/website-terms/), effective 1 August 2025, prohibit overburdening services and circumventing limits in section 7. Section 8 separately restricts automated access and use for AI systems, subject to its stated robots.txt and user-agent conditions. Publishing RSS or an agent-assessment prompt does not establish blanket permission for AI ingestion or training. These tools do not train models, but that alone does not establish an exemption. Confirm the intended AI use with Cloudflare before distributing that capability; RSS-specific AI authorization was not established by this review.

No numeric refresh limit was found in these official publications or the feed metadata. The live RSS response returned `Cache-Control: public, max-age=300` and no RSS `ttl`, license, or copyright element. The five-minute HTTP freshness lifetime is an observation, not a contractual polling allowance. The extension keeps a conservative one-hour interval and honors longer server `Retry-After` delays. Requests stop at challenges and redirects; the adapter does not bypass them. Radar's robots.txt returned a challenge during this check, so it could not establish any AI user-agent permission.

Cloudflare does not endorse this extension. The findings above document the published rules and their limits; they do not claim that Cloudflare approved this integration.
