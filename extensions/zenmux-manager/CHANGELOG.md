# ZenMux Manager Changelog

## [Add Windows Support] - {PR_MERGE_DATE}

- Make the extension available on both macOS and Windows.
- Remove the macOS-only menu bar command from the published command set so the extension can support Windows.
- Add an inline status command for quota and PAYG balance, refreshed every 2 minutes.
- Keep the ZenMux usage dashboard and Raycast AI account tools available cross-platform.

## [Improve PAYG-Only Account Display] - 2026-05-14

- Hide subscription quota, plan, flow rate, and subscription console links when an account has no ZenMux subscription.
- Show PAYG credit balance cleanly in the usage dashboard, menu bar, and AI account summary for PAYG-only users.
- Treat missing subscription details as expected partial data when PAYG balance is available.

## [Preserve Platform API Key Preference Storage] - 2026-05-12

- Preserve the existing Platform API key preference name so current users keep their saved configuration after updating.
- Refresh curated ZenMux documentation references and verification coverage.

## [Improve ZenMux AI Documentation Support] - 2026-05-11

- Add richer ZenMux documentation search for setup, routing, billing, fallback, streaming, and integration questions.
- Add an LLM knowledge verification script to keep AI extension answers aligned with curated ZenMux docs.
- Refine usage dashboard and menu bar actions for faster refreshes, copying snapshots, and opening ZenMux consoles.
- Polish quota display layout, progress indicators, metadata, and screenshots for the Raycast Store.

## [Initial Version] - 2026-05-10

- Add ZenMux subscription quota dashboard.
- Add PAYG credit balance display.
- Add macOS menu bar monitor.
- Add quick links to ZenMux account consoles.
- Add monthly quota cap display and rolling quota reset details.
