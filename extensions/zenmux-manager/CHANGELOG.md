# ZenMux Manager Changelog

## [AI Models] - 2026-09-24

- Provide ZenMux chat models to Raycast AI Chat, Quick AI, and AI Commands.
- Add a Model API Key preference for Subscription (`sk-ss-v1-...`) and PAYG (`sk-ai-v1-...`) keys. The Platform API key stays account-only.
- Discover the live ZenMux catalog, including context length, vision, and reasoning capabilities.
- Offer Minimal, Low, Medium, and High reasoning effort for models whose catalog sets `capabilities.reasoning` to true, and send the selected effort as `reasoning_effort`. Medium is the default.
- Reject interrupted streams and malformed tool calls, and preserve refusal text.
- Enable tool calling when catalog metadata is absent, while respecting explicit unsupported flags.
- Stream text, reasoning, and tool calls from ZenMux's OpenAI-compatible chat endpoint.

## [Initial Release] - 2026-05-20

- Add ZenMux subscription quota dashboard.
- Add PAYG credit balance display.
- Add quick links to ZenMux account consoles.
- Add monthly quota cap display and rolling quota reset details.
- Make the extension available on both macOS and Windows.
- Add an inline status command for quota and PAYG balance, refreshed every 2 minutes.
- Hide subscription quota, plan, flow rate, and subscription console links when an account has no ZenMux subscription.
- Show PAYG credit balance cleanly in the usage dashboard, status command, and AI account summary for PAYG-only users.
- Treat missing subscription details as expected partial data when PAYG balance is available.
- Preserve the existing Platform API key preference name so current users keep their saved configuration after updating.
- Add richer ZenMux documentation search for setup, routing, billing, fallback, streaming, and integration questions.
- Add an LLM knowledge verification script to keep AI extension answers aligned with curated ZenMux docs.
- Refine usage dashboard actions for faster refreshes, copying snapshots, and opening ZenMux consoles.
- Polish quota display layout, progress indicators, metadata, and screenshots for the Raycast Store.
