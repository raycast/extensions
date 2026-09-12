// ---- Auth ----

export interface AuthState {
  accessToken: string | null;
  tokenTimestamp: string | null;
  userId: string | null;
  isExpired: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  onLoginSuccess: (enctoken: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ---- Stocks: Holdings ----

export interface Holding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  t1_quantity: number;
  instrument_token: number;
}

// ---- Stocks: Positions ----

export interface Position {
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  product: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  day_m2m: number;
  buy_quantity: number;
  sell_quantity: number;
  buy_price: number;
  sell_price: number;
  multiplier: number;
  value: number;
  overnight_quantity: number;
}

export interface PositionsResponse {
  net: Position[];
  day: Position[];
}

// ---- Stocks: Orders ----

export interface Order {
  order_id: string;
  exchange: string;
  tradingsymbol: string;
  transaction_type: "BUY" | "SELL";
  order_type: string;
  product: string;
  quantity: number;
  price: number;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  status: string;
  status_message: string | null;
  order_timestamp: string;
  exchange_timestamp: string | null;
  tag: string | null;
}

// ---- Stocks: Margins ----

export interface MarginSegment {
  enabled: boolean;
  net: number;
  available: {
    adhoc_margin: number;
    cash: number;
    collateral: number;
    intraday_payin: number;
    live_balance: number;
    opening_balance: number;
  };
  utilised: {
    debits: number;
    exposure: number;
    m2m_realised: number;
    m2m_unrealised: number;
    option_premium: number;
    payout: number;
    span: number;
    holding_sales: number;
    turnover: number;
  };
}

export interface MarginsResponse {
  equity: MarginSegment;
  commodity: MarginSegment;
}

// ---- Mutual Funds: Holdings ----

export interface MFHolding {
  folio: string;
  fund: string;
  tradingsymbol: string;
  average_price: number;
  last_price: number;
  last_price_date: string;
  pnl: number;
  quantity: number;
}

// ---- Mutual Funds: SIPs ----

export interface SIP {
  sip_id: string;
  tradingsymbol: string;
  fund: string;
  frequency: string;
  instalment_amount: number;
  instalments: number;
  instalment_day: number;
  status: string;
  created: string;
  last_instalment: string;
  next_instalment: string;
  step_up: { [key: string]: number };
  sip_type: string;
  tag: string | null;
  pending_instalments: number;
}

// ---- Mutual Funds: Orders ----

export interface MFOrder {
  order_id: string;
  exchange_order_id: string | null;
  tradingsymbol: string;
  fund: string;
  transaction_type: "BUY" | "SELL";
  status: string;
  status_message: string | null;
  amount: number;
  quantity: number;
  price: number;
  last_price: number;
  average_price: number;
  folio: string | null;
  placed_by: string;
  order_timestamp: string;
  exchange_timestamp: string | null;
  tag: string | null;
}

// ---- Cache ----

export interface CachedData<T> {
  data: T;
  timestamp: string;
}

// ---- Portfolio View ----

export type PortfolioView = "stocks" | "mutualfunds";
