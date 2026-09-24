# Public Zoom and meeting-prep skill research

Reviewed on September 24, 2026. Zoom publishes first-party developer skills, but their MCP and SDK workflows are broader than this extension's six registered tools. The bundled skill combines the existing upcoming-meeting reader with a constrained preparation format; it does not add connectors or new API calls.

## Selected source

[Mohit Aggarwal's meeting-prep-live](https://github.com/mohitagw15856/pm-claude-skills/blob/f6ca79348c5518f1b0e8bcfd6da53b61251c0fa2/skills/meeting-prep-live/SKILL.md), pinned at `f6ca79348c5518f1b0e8bcfd6da53b61251c0fa2`, provides a useful brief structure: identify the real meeting, use available evidence, state the objective, propose useful questions, and name missing context. Its complete MIT notice is preserved verbatim in [LICENSE](LICENSE).

[SKILL.md](SKILL.md) is a modified adaptation. The source workflow reads Google Calendar, Drive, email, and Slack; none of those tools exists in this extension. That context-gathering operation is excluded and reported as unsupported when requested. The skill uses only returned Zoom metadata plus material the user supplies. It does not infer attendees' views, claim a decision exists merely because a meeting is scheduled, or save/send a draft agenda.

## Other public sources reviewed

| Source | Pinned revision | Fit and exclusions |
| --- | --- | --- |
| [Zoom Meetings MCP skill](https://github.com/zoom/skills/blob/381814b1e579d4b1b222612dbdfa3be5fb34e8cb/skills/zoom-mcp/meetings/SKILL.md) | `381814b1e579d4b1b222612dbdfa3be5fb34e8cb` | Official MIT source for semantic meeting search, meeting assets, cloud recordings, and recording-resource retrieval. Its four read tools are not registered here. Reviewed to establish the capability gap; no MCP setup or unavailable tools are copied into the bundle. |
| [Zoom's setup-zoom-mcp workflow](https://github.com/zoom/zoom-plugin/blob/9311dd4b31e8e55c27b95479a84601576e449e97/skills/setup-zoom-mcp/SKILL.md) | `9311dd4b31e8e55c27b95479a84601576e449e97` | Official developer workflow for planning connectors, OAuth, server scopes, and hybrid integrations. Not an end-user preparation workflow for the existing Raycast tools; not copied. |
| [Mohit Aggarwal's meeting-prep-pack](https://github.com/mohitagw15856/pm-claude-skills/blob/f6ca79348c5518f1b0e8bcfd6da53b61251c0fa2/skills/meeting-prep-pack/SKILL.md) | `f6ca79348c5518f1b0e8bcfd6da53b61251c0fa2` | Broader preparation around positions, concessions, attendees' likely stances, and desired outcomes. Not adopted: meeting metadata does not establish that background. User-provided goals remain optional context. |
| [Alireza Rezvani's meetings skill](https://github.com/alirezarezvani/claude-skills/blob/19392f7a08264ed00486a251f5b2098321771f94/productivity/meetings/skills/meetings/SKILL.md) | `19392f7a08264ed00486a251f5b2098321771f94` | MIT meeting-cost, agenda, and action-extraction workflow backed by Python scripts. Not copied: cost calculations, mandatory cancellation gates, script execution, and post-meeting note extraction are outside this skill's scope. |
| [LeanCode's ai-plugins repository](https://github.com/leancodepl/ai-plugins/tree/6f60039357e1748657d16c3b8fe493890681de6a) | `6f60039357e1748657d16c3b8fe493890681de6a` | A public skill catalog advertised `meetings-prep`, but no meeting-named `SKILL.md` path was present in the inspected current tree. Not used as a reusable source. |

No upstream scripts or installation commands were executed. Only the selected source's textual preparation guidance is adapted.

## Mapping to the extension

The manifest and every file in `src/tools/` were read before editing. [TOOLS.md](TOOLS.md) lists all six registered tools and their 13 top-level inputs, plus the imported timezone alias. Existing manifest instructions and eight evals were reviewed along with the meeting API, response merge, authentication, and URL helpers.

- Call `get-upcoming-meetings` without invented filters or pagination arguments. Select and sort returned rows locally. Keep recurring/no-time/all-day rows separate and avoid claiming live meeting status from scheduled times.
- Respect the reader's coverage: hosted meetings plus supplementary invitations limited to the next 24 hours, no paging, possible silent hosted-only fallback, and counts that can describe only merged rows. The [official Meetings API documentation](https://developers.zoom.us/docs/api/meetings/) confirms the invited-feed window and calendar-integration prerequisite. A missing event or gap is not a complete calendar finding.
- Preserve the returned join URL and only use metadata actually present. The local TypeScript meeting shape does not make missing agenda or duration fields real. Do not misuse edit/delete confirmations to reach their private details helper.
- Keep confirmed metadata, user-supplied context, and proposed questions/agendas visibly separate. A title alone does not establish an objective, participants, past decisions, or action items. Source URLs are not permission or tools for fetching their contents.
- Stop unsupported retrieval of transcripts, recordings, attendee research, calendar events, documents, or previous commitments. A user may provide relevant text, but the skill does not claim it fetched that material itself.
- Keep the brief in chat. The preparation workflow does not create, edit, delete, or join a meeting, and suggestions to prepare do not trigger the existing `Blocked` scheduling instruction.

Only the skill registration, skill/research documentation, license notice, and changelog are added. Existing source, manifest instructions/evals, API dependency and lockfiles were unchanged during the initial preparation. No Zoom account data was queried and no meeting was changed or opened during this preparation.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These are future manual prompts and expected behavior, not executed transcripts:

1. **Next meeting brief:** "Prep me for my next Zoom meeting. I'm presenting; use Asia/Kolkata and keep the brief short." Expect a no-input upcoming read, chronological future selection, timezone handling, the original join link, supported facts, and proposed questions. No automatic join or mutation.
2. **Named meeting and agenda:** "Prepare me for tomorrow's Acme rollout meeting. We need to decide whether to expand the pilot; draft a 20-minute agenda here and don't change Zoom." Expect exact meeting disambiguation, timezone boundaries, user-supplied objective attribution, a draft fitting the requested/returned duration, and missing agenda fields handled honestly. A later-than-24-hour invited meeting may be unavailable and must not be invented.
3. **Missing sources and complete-calendar request:** "Prepare me for all next week's Zoom calls using the recordings and action items from last time, and tell me which gaps are free." Expect explicit stops at unavailable historical sources and complete-calendar/availability claims. Any retained brief must be limited to returned meetings and supplied context, with no fabricated history or time blocking.
