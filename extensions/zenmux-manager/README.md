# ZenMux Manager

Manage your [ZenMux](https://zenmux.ai/) subscription quota, Pay As You Go credit balance, account links, and AI-assisted ZenMux questions from Raycast.

ZenMux is an LLM API aggregation platform that provides unified access to models from providers such as OpenAI, Anthropic, Google, and more. It supports multiple API protocols, model routing, provider fallback, request logs, usage analytics, and both subscription and pay-as-you-go billing.

## Features

- View your ZenMux plan, account status, Flow rate, and PAYG balance.
- Track 5-hour, 7-day rolling, and monthly subscription quota.
- Ask Raycast AI about your current ZenMux account and quota status.
- Open the ZenMux subscription, PAYG, logs, and Platform API consoles from Raycast.

## Setup

1. Sign in to ZenMux, or [sign up](https://zenmux.ai/login) if you are new to ZenMux.
2. Open the [ZenMux Platform API console](https://zenmux.ai/platform/management).
3. Create a Platform API key.
4. Open this extension's preferences in Raycast.
5. Paste the key into **Platform API Key**.

Standard ZenMux API keys are not accepted by the account endpoints. This extension requires a Platform API key because it reads subscription and PAYG account data.

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

Raycast AI features may require Raycast Pro access and are currently unavailable on Raycast for Windows. On Windows, use the account commands and links; AI chat tools are available on macOS only.

## Links

- [ZenMux Homepage](https://zenmux.ai/)
- [ZenMux Documentation](https://docs.zenmux.ai/)
- [Quick Start Guide](https://docs.zenmux.ai/guide/quickstart)
- [Platform API Console](https://zenmux.ai/platform/management)
