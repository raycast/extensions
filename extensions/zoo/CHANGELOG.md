# Zoo Changelog

## [Update AI Providers and Prompt Workflow] - 2026-11-10

- Zoo now supports OpenAI, Google Gemini, Anthropic Claude, DeepSeek, and custom OpenAI-compatible services with provider-specific endpoints.
- The model presets have been refreshed. Provider Default now selects a current model for the chosen service, and Custom Model ID continues to override the preset.
- Named providers now use their official endpoints. Existing custom endpoints remain available through Automatic or Custom mode.
- Selected text is captured before prompt selection, and users can enter text when no selection is available.
- Streaming handles usage-only chunks, cancellation, retries, empty responses, and output limits.
- Gist actions wait for the matching file content, and pagination stops when GitHub has no further pages.
- The new Check AI Connection command checks API access and model availability without sending a prompt or input text.
- Error messages identify common key, access, region, billing, and context-limit failures without displaying raw provider responses.
- Token counts now use provider-reported usage. Cost estimates use explicitly configured prices in USD per million tokens, replacing the previous built-in estimates.
- The README now explains the bring-your-own-key workflow, provider setup, prompt examples, and API costs.

## [Fix OpenAI client in store builds] - 2026-11-10

- Upgrade the `openai` package from v4 to v7. v4 fails to load in store builds

## [New Feature] - 2025-02-27

- 🍮 Support custom models

## [Add Google Gemini Support] - 2025-01-19

- ✨ **Google Gemini** support added.

## [Release Zoo Extension] - 2025-01-15

- 🎉 Release of GitHub Gist version 0.1
- 🦄 **Ask Gist** command: Now you can ask AI using your Gist as a prompt.
