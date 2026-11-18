# ZenMux Manager

Manage your [ZenMux](https://zenmux.ai/) subscription quota, Pay As You Go credit balance, account links, and AI-assisted ZenMux questions from Raycast.

ZenMux is an LLM API aggregation platform that provides unified access to models from providers such as OpenAI, Anthropic, Google, and more. It supports multiple API protocols, model routing, provider fallback, request logs, usage analytics, and both subscription and pay-as-you-go billing.

## Features

- View your ZenMux plan, account status, Flow rate, and PAYG balance.
- Track 5-hour, 7-day rolling, and monthly subscription quota.
- Ask Raycast AI about your current ZenMux account and quota status.
- Use ZenMux chat models in AI Chat, Quick AI, and AI Commands.
- Open the ZenMux subscription, PAYG, logs, and Platform API consoles from Raycast.

## Setup

1. Sign in to ZenMux, or [sign up](https://zenmux.ai/login) if you are new to ZenMux.
2. Open the [ZenMux Platform API console](https://zenmux.ai/platform/management).
3. Create a Platform API key.
4. Open this extension's preferences in Raycast.
5. Paste the key into **Platform API Key**.

Standard ZenMux API keys are not accepted by the account endpoints. This extension requires a Platform API key because it reads subscription and PAYG account data.

To use ZenMux models inside Raycast AI, also add a model key:

1. Create a [Subscription API key](https://zenmux.ai/platform/subscription) (`sk-ss-v1-...`) or a [PAYG API key](https://zenmux.ai/platform/pay-as-you-go) (`sk-ai-v1-...`).
2. Paste it into **Model API Key** in this extension's preferences.
3. In Raycast's model picker, allow ZenMux Manager to provide models.

The Model API Key and the Platform API Key are not interchangeable. Model calls go to `https://zenmux.ai/api/v1`. Account calls stay on the Platform API. Extension-provided models require Raycast Pro.

## Commands

- **ZenMux Status**: Inline quota and PAYG balance in Raycast, refreshed every 2 minutes.
- **Show ZenMux Usage**: Full account dashboard.

## Raycast AI

This extension includes AI tools that let Raycast AI answer questions about your current ZenMux account data and search curated ZenMux documentation. In Raycast AI, mention this extension and ask questions such as:

- `How much 5-hour quota do I have left?`
- `What does PAYG balance mean?`
- `When does my 7-day quota reset?`
- `How do I configure Cursor with ZenMux?`
- `How does provider routing work?`
- `Which API endpoint should I use for Anthropic Messages?`

Raycast AI features may require Raycast Pro access and are currently unavailable on Raycast for Windows. On Windows, use the account commands and links; AI chat tools and extension-provided models are available on macOS only.

ZenMux models stream text and reasoning, and accept image attachments when the catalog declares image input. Image generation is not supported. Tool calling is enabled for chat models unless the catalog explicitly marks it unsupported. ZenMux currently omits tool-capability metadata, so this is a compatibility default, not a guarantee for every model. Models with reasoning enabled in the ZenMux catalog offer Minimal, Low, Medium, and High effort in Raycast. Medium is the default. Accepted effort levels vary by model and are not listed in the catalog; a model may reject a selected level. Raycast does not pass a provider's reasoning signature back to the extension, so a later tool-calling turn can fail on a model that requires that signature.

## Links

- [ZenMux Homepage](https://zenmux.ai/)
- [ZenMux Documentation](https://docs.zenmux.ai/)
- [Quick Start Guide](https://docs.zenmux.ai/guide/quickstart)
- [Platform API Console](https://zenmux.ai/platform/management)
