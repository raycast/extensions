# Zerion Raycast Extension

Raycast commands for looking up wallets, tokens and market data through the public Zerion API.

## Language

**Wallet Overview**:
The screen for one wallet, opened via "View Wallet" or by selecting a wallet in My Wallets. Shows the portfolio line (which opens Performance), Recent Activity, and positions grouped by dapp.
_Avoid_: Address view, wallet page

**Performance**:
The screen for one wallet's value over time: the total value, the change over the selected Period, and a line chart of that Period. Opened from a wallet's portfolio line.
_Avoid_: Portfolio chart, balance history

**Period**:
The time range a Performance chart covers, ending now: 1H, 1D, 1W, 1M, 1Y or Max. 1D unless the user picks another.
_Avoid_: Timeframe, range, interval

**Recent Activity**:
The short preview (latest 2, non-trash) of a wallet's History shown on the Wallet Overview, ending with an entry that opens the full History.

**History**:
The full, paginated list of a wallet's on-chain activity, newest first.
_Avoid_: Transactions list, activity feed

**Transaction**:
One on-chain transaction as seen from the wallet's perspective; the unit of a History row. Has an operation type (send, trade, deposit…), a status (confirmed, failed, pending), a chain, and a fee.
_Avoid_: Action (the web app's term for a possibly multi-transaction group)

**Act**:
One logical step inside a Transaction (e.g. an approve and a trade in the same transaction).

**Transfer**:
A movement of an asset (token or NFT) into or out of the wallet within an Act, with a direction: in, out, or self.

**Approval**:
A spending permission granted (or revoked) for an asset within an Act.

**Token Details**:
The side panel for one token, opened with ⌘D from a position on the Wallet Overview or a token in Search Web3. Shows the token's 1D price chart, its Market Data, the position it was opened from and, on the Wallet Overview, the wallet's Token PnL.
_Avoid_: Asset detail, token page, fungible details

**Market Data**:
A token's market figures: price, 24h change, market cap, fully diluted valuation, 24h volume, circulating and total supply, and 30d/90d/1y changes.
_Avoid_: Stats, token info

**Token PnL**:
A wallet's profit and loss for one token: total, realized and unrealized gain, and total and net invested. Covers every position of that token in the wallet, not one row.
_Avoid_: Performance (that is the wallet value chart), returns

## Relationships

- A **Wallet Overview** shows one **Recent Activity** preview, which links to that wallet's **History**
- A wallet's portfolio line opens that wallet's **Performance**
- A **Performance** screen shows exactly one **Period** at a time
- **Recent Activity** and **History** follow the Wallet Overview's chain filter; neither ever shows trash Transactions
- **History** lists **Transactions**; a **Transaction** has one or more **Acts**; each **Act** has zero or more **Transfers** and **Approvals**
- A **Wallet Overview** position and a Search Web3 token each open **Token Details**; only the Wallet Overview one includes **Token PnL**
- **Token PnL** follows the Wallet Overview's chain filter, like Recent Activity and History
