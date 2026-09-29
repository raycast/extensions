# Zerion Changelog

## [Public Zerion API] - {PR_MERGE_DATE}

- Moved all data fetching to the public Zerion API (api.zerion.io) with a personal API key
- Added Sign in with Zerion: the first command you run opens a browser consent page at dashboard.zerion.io and connects a free API key automatically — no manual setup
- ENS names and avatars are now resolved via public ENS infrastructure
- Removed the Zerion membership badges (Level, Premium) that relied on the internal API
- Removed the AI tools for generating swap/send links
- Updated Raycast libraries, TypeScript, and ESLint to current versions
- Fixed broken links in View Top Gainers, View Top Losers, and View Market
- Added View Top Movers, View Trending Tokens, View Stocks, and View Perps commands
- Added Token Details (⌘D) to Overview positions and Search Web3 tokens: 1D price chart, market data, and the wallet's PnL for that token
- Added Recent Activity and a full History to the Wallet Overview, with a details drawer (⌘D) for each transaction

## [Security Fix] - 2026-03-17

- Bump lodash/lodash-es to fix prototype pollution vulnerability (CVE-2025-13465)

## [Zerion AI Extension] - 2025-05-13

- Analyze token stats, info and historical prices
- Analyze wallet portfolio
- Generate links to Trade and Send forms with the netural language

## [Zerion Client] - 2024-12-20

- View wallet portfolio
- Search tokens, addresses or domains
- Show Wallet total value in the menu bar
- Safe multiple addresses for quick access

## [Initial Version] - 2024-01-18
