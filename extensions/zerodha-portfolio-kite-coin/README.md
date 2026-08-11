# Zerodha Portfolio (Kite+Coin)

A Raycast extension to view your Zerodha portfolio — stocks from Kite and mutual funds from Coin — right from your launcher.

## What it does

Open Raycast, search for "Zerodha Portfolio", and see your:

**Stocks (Kite)**
- Holdings — your long-term investments with current value and P&L
- Positions — open intraday/F&O positions
- Today's Orders — status of orders placed today
- Margins — available funds and net equity

**Mutual Funds (Coin)**
- MF Holdings — your mutual fund investments with returns
- Active SIPs — running SIPs with next instalment date
- Recent MF Orders — latest purchase/redemption orders

Use the dropdown at the top-right to switch between Stocks and Mutual Funds.

## How login works

Zerodha's OAuth costs Rs. 2000/mo, so this extension logs you in directly via Zerodha's API instead.

1. Enter your **User ID**, **Password**, and **TOTP code** (from your authenticator app)
2. The extension authenticates with Zerodha and gets a session token
3. This token is stored locally and lasts until 6 AM IST the next day
4. You'll need to log in once per day when the token expires

**Remember User ID** — check this to have your User ID auto-filled on the next login. Only the User ID is saved locally. Your password and TOTP are never stored anywhere.

**Show/Hide Password** — press `Option+E` on Mac or `Alt+E` on Windows to toggle password visibility.

## Privacy

- Your credentials go directly to Zerodha's servers — never to any third-party
- Only the session token (and optionally your User ID) is stored locally
- Portfolio data is cached locally so you can see your last-known data even when the session expires
- No data is collected, tracked, or sent anywhere else
