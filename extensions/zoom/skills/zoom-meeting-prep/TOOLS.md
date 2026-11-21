# Existing Zoom AI tools

Reviewed against `package.json` and all six files in `src/tools/` on September 24, 2026. There are six registered tools with 13 top-level inputs. `?` means optional. The meeting API, response-merging, OAuth, and URL helpers were also read to verify behavior.

| Tool | Inputs |
| --- | --- |
| [get-upcoming-meetings](../../src/tools/get-upcoming-meetings.ts) | None |
| [create-meeting-link](../../src/tools/create-meeting-link.ts) | None |
| [schedule-meeting](../../src/tools/schedule-meeting.ts) | `start_time: string`; `duration: number`; `agenda?: string`; `topic?: string`; `timezone?: timezone` |
| [delete-meeting](../../src/tools/delete-meeting.ts) | `meetingId: string` |
| [join-meeting](../../src/tools/join-meeting.ts) | `meetingId: string` |
| [edit-meeting](../../src/tools/edit-meeting.ts) | `meetingId: string`; `start_time?: string`; `duration?: number`; `agenda?: string`; `topic?: string`; `timezone?: timezone` |

The `timezone` alias is the existing [134-value union](../../src/api/timezones.ts). It includes both named zones and legacy aliases; it is not an arbitrary string input or a timezone-discovery tool. That write-input restriction does not prevent displaying returned timestamps in a user-specified timezone.

## The meeting reader

- `get-upcoming-meetings` takes no inputs and returns the API's meeting-list response. The local type describes `meetings` and optional total/page fields. Meeting fields include ID, UUID, topic, start time where applicable, duration, timezone, join URL, and agenda, but the code casts raw responses without validating or filling missing fields. Read only fields actually present. Numeric IDs may arrive despite the local string type.
- The helper first fetches one page from `/users/me/meetings?type=upcoming&page_size=300`, then one from `/users/me/upcoming_meetings`. The latter can include invited meetings, but Zoom documents a next-24-hours window and requires calendar integration for third-party invitations. See the [Zoom Meetings API](https://developers.zoom.us/docs/api/meetings/) and the extension's [README](../../README.md).
- A failure in the primary hosted-meeting request throws. A failure or malformed meeting array in the supplementary request silently falls back to the hosted response. Successful output therefore does not prove that invitations were included. Authentication uses the extension's existing Raycast Zoom OAuth integration; the skill never asks for tokens.
- List requests retry HTTP 429 within the helper, up to three total attempts, respecting a numeric `Retry-After` or a short increasing fallback delay. In-flight reads share one promise until it settles. Repeating the tool does not advance a page or change the query.
- Neither endpoint is paged. The tool has no page, cursor, limit, date, or search input. A returned hosted `next_page_token` can reveal missing results but cannot be passed back. The merge discards invited pagination and overwrites `total_records` with the deduplicated returned count while retaining hosted page metadata. Neither a blank token nor a count equal to the array length establishes complete coverage.
- The merge appends hosted then invited rows, deduplicating by UUID when present, otherwise ID/start time/topic. It keeps the first matching row, without merging richer fields, and does not sort chronologically. A shared series UUID can also cause rows to collapse; do not infer that every recurrence is represented. Keep distinct returned occurrences separate and filter/sort the actual timestamps for the requested brief.
- Type 3 represents a recurring meeting without a fixed time. Instant/invalid/missing-time rows or any returned all-day flag also need separate treatment. A nominal start plus duration is a scheduled interval, not evidence of real-time meeting activity or a complete availability window.
- There is no registered meeting-details reader, attendee lookup, recording/transcript reader, historical action-item source, calendar reader, or document/link reader. The private `getMeeting` helper is used inside mutation confirmations; invoking an edit/delete just to trigger that helper is not a supported read workflow.

## Existing action tools

- `create-meeting-link` creates a new instant meeting with `type: 1` and returns the raw meeting response. It does not look up an existing link, reuse the Start Meeting command's Personal Meeting ID preference, or join the meeting. It is a write even though it has no inputs or tool confirmation.
- `schedule-meeting` requires start time and duration in minutes. Optional agenda and topic are documented with 2,000- and 200-character limits. It forwards supplied fields to the create endpoint and returns the raw meeting response. It has a Raycast confirmation; it has no attendee, invitation, calendar, recording, recurrence, or idempotency input.
- `edit-meeting` sends a PATCH containing the supplied optional fields for a meeting ID. Its confirmation reads the existing meeting and displays field differences. The tool returns no updated meeting object. There is no occurrence ID or recurrence payload, so occurrence-specific rescheduling cannot be expressed through this tool.
- `delete-meeting` deletes by meeting ID after a Raycast confirmation that reads its details. It has no occurrence-specific input and returns no meeting object. Neither this nor edit is part of the preparation workflow.
- `join-meeting` opens an HTTPS join URL on macOS or the Zoom protocol on Windows. It accepts only a meeting ID, does not preserve an existing join URL's passcode parameters, and returns no proof that the user entered the meeting. It does not retrieve context. The skill displays the original returned `join_url` and does not join automatically.
- Creation/edit/deletion requests do not use the list helper's retry loop. No action tool accepts an idempotency key. An uncertain write should not be repeated blindly; a preparation request does not authorize any write in the first place.
- Existing manifest instructions require meeting links when possible and interpret an explicit request to block time as scheduling a meeting titled `Blocked`. Those instructions and all eight existing evals are preserved. Suggested preparation time or a gap between returned meetings is not an implicit request to schedule a block.

The bundled skill deliberately calls only `get-upcoming-meetings`. The other tools are inventoried to distinguish real capabilities from unsupported preparation shortcuts. This inventory is audit material, not a runtime dependency.
