# Architecture

## Overview

The extension is split into:

- `src`: Raycast command UIs.
- `src/core`: shared domain logic and remote integrations.
- `src/types`: shared contracts.

## Request Paths

- Zo API calls go through `ZoApiClient`.
- All requests use common config/auth and error normalization.

## Activity Path

- Execution records are stored via `ActivityStore`.
- Sensitive parameters are redacted before persistence.
- Legacy non-API records are pruned on read/write migration.
