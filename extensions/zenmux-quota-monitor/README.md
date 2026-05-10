# ZenMux Quota Monitor

Monitor your ZenMux subscription quota and Pay As You Go credit balance from Raycast.

## Features

- View your ZenMux plan, account status, Flow rate, and PAYG balance.
- Track 5-hour, weekly, and monthly subscription quota.
- Show compact usage stats in the macOS menu bar.
- Open the ZenMux subscription, PAYG, and Management consoles from Raycast.

## Setup

1. Open the [ZenMux Management console](https://zenmux.ai/platform/management).
2. Create a Management API key.
3. Open this extension's preferences in Raycast.
4. Paste the key into **Management API Key**.

Standard ZenMux API keys are not accepted by the account endpoints. This extension requires a Management API key because it reads subscription and PAYG account data.

## Commands

- **Show ZenMux Usage**: Full account dashboard.
- **ZenMux Usage Menu Bar**: Compact menu bar monitor, refreshed every 2 minutes.
