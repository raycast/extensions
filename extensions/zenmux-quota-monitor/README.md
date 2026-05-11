# ZenMux Quota Monitor

Monitor your [ZenMux](https://zenmux.ai/) subscription quota and Pay As You Go credit balance from Raycast.

ZenMux is an LLM API aggregation platform that provides unified access to models from providers such as OpenAI, Anthropic, Google, and more. It supports multiple API protocols, model routing, provider fallback, request logs, usage analytics, and both subscription and pay-as-you-go billing.

## Features

- View your ZenMux plan, account status, Flow rate, and PAYG balance.
- Track 5-hour, weekly, and monthly subscription quota.
- Show compact usage stats in the macOS menu bar.
- Open the ZenMux subscription, PAYG, logs, and Platform API consoles from Raycast.

## Setup

1. Sign in to ZenMux, or [sign up with this referral link](https://zenmux.ai/invite/SEOW92) if you are new to ZenMux.
2. Open the [ZenMux Platform API console](https://zenmux.ai/platform/management).
3. Create a Platform API key.
4. Open this extension's preferences in Raycast.
5. Paste the key into **Platform API Key**.

Standard ZenMux API keys are not accepted by the account endpoints. This extension requires a Platform API key because it reads subscription and PAYG account data.

## Commands

- **Show ZenMux Usage**: Full account dashboard.
- **ZenMux Usage Menu Bar**: Compact menu bar monitor, refreshed every 2 minutes.

## Links

- [ZenMux Homepage](https://zenmux.ai/)
- [ZenMux Documentation](https://docs.zenmux.ai/)
- [Quick Start Guide](https://docs.zenmux.ai/guide/quickstart)
- [Platform API Console](https://zenmux.ai/platform/management)
