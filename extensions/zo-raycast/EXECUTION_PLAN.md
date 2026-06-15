# Execution Plan

## Goal

Ship and maintain a production-grade Raycast extension focused on Zo API chat workflows.

## Scope

- Commands:
  - `Zo Setup`
  - `Zo Chat`
  - `Zo Models`
  - `Zo Activity`
- Integrations:
  - Zo API `/models/available`
  - Zo API `/zo/ask` (streaming and non-streaming)
- Supporting systems:
  - typed app config and auth
  - resilient HTTP client (timeout + retries)
  - activity persistence with sensitive-value redaction
  - legacy activity migration to API-only records

## Architecture

- `src/zo-setup.tsx`
  - validates API key and Zo API reachability.
- `src/zo-chat.tsx`
  - chat UX with model selection, optional streaming, and thinking visibility controls.
- `src/zo-models.tsx`
  - model listing and default-model selection.
- `src/zo-activity.tsx`
  - activity history and replay for `zo.chat` runs.
- `src/core/api/ZoApiClient.ts`
  - Zo API adapter and stream parsing for `/zo/ask`.
- `src/core/http/HttpClient.ts`
  - shared request layer with retries and timeout handling.
- `src/core/activity/ActivityStore.ts`
  - local activity storage + redaction + legacy-record pruning.

## Behavioral Requirements

- Chat requests must continue using `/zo/ask`.
- Streaming remains preference-controlled and disabled by default.
- Activity entries must redact secrets before persistence.
- Existing non-API activity entries must be removed automatically on read/write migration.
- Replay must only support valid `zo.chat` API entries.

## Testing Requirements

- Unit tests must cover:
  - app config parsing defaults/overrides.
  - Zo API output parsing for chat and streaming edge cases.
  - sensitive-value redaction.
  - activity migration that prunes non-API records and rewrites storage.
- Repo checks required before release:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

## Definition of Done

- No MCP command, preference, module, test, or documentation remains.
- Command surface and docs reflect API-only behavior.
- All quality checks pass locally.
