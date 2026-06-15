# Zo Raycast Extension

Raycast extension for Zo API chat, models, and activity.

## Preview

![Zo extension icon](assets/icon.png)

## What Is Implemented

- Raycast command surface:
  - `Zo Setup`
  - `Zo Chat`
  - `Zo Models`
  - `Zo Activity`
- Core services:
  - typed config and auth handling
  - HTTP client with timeout and retry policy
  - Zo API client (`/models/available`, `/zo/ask`)
  - activity storage with sensitive-field redaction
- UX behaviors:
  - optional streaming chat mode in `Zo Chat` (disabled by default)
  - assistant thinking captured separately and hidden by default
  - activity replay support for prior `zo.chat` runs
- Tooling:
  - TypeScript strict config
  - ESLint + Prettier + Vitest
  - CI workflow (lint, typecheck, test, format)

## Documentation

- Architecture: `docs/architecture.md`
- Privacy: `docs/privacy.md`
- Contributing: `CONTRIBUTING.md`

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run format
```

## Store Submission Checklist

- Keep at least one screenshot and at most six screenshots in light mode only.
- Add a `Zo Setup` screenshot to complete command coverage.
- Keep changelog headings in Raycast format: `## [Title] - {PR_MERGE_DATE}`.
- Run `npm run publish` to submit once metadata/screenshots are ready.
