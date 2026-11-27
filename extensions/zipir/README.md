# Zıpır for Raycast

Turn a document into a narrated video lesson where every on-screen sentence cites its source, and follow your lessons without leaving the command bar.

## Commands

- **My Lessons** — your lessons with their phase; approve a storyboard, copy a download link, open the lesson in Zıpır. Filter by "Waiting for approval", "Ready" or "Rendering".
- **New Lesson** — start a lesson from pasted text or a public page URL, optionally choosing a format. Nothing renders until the storyboard is approved.
- **Video Minutes** — the account's video-minute usage for the current period.

## Setup

1. Create an API key in Zıpır: https://app.zipirapp.com/hesap (Account → API).
2. In Raycast, open any command and paste the key into the **API Key** preference (stored as a password).
3. Leave **API Base** empty to use `https://api.zipirapp.com`.

## Notes

- Approving a storyboard starts the render and the lesson's length counts against the account's included video minutes; the extension asks for confirmation first.
- Download links are signed and expire in 15 minutes.
- Errors show Zıpır's own message and code, with the request id for support.

Docs: https://zipirapp.com/en/api/ · Support: merhaba@zipirapp.com · Privacy: https://zipirapp.com/gizlilik/
