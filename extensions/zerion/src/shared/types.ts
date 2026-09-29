export interface ChainInfo {
  id: string;
  name: string;
  iconUrl: string | null;
  /** Explorer transaction URL with a `{HASH}` placeholder. */
  txUrlFormat: string | null;
}

export interface AddressPortfolio {
  totalValue: number;
  change24h: {
    absolute: number;
    relative: number;
  };
  positionsChainsDistribution: Record<string, number>;
}

export type PositionType = "wallet" | "deposit" | "loan" | "locked" | "staked" | "reward" | "investment";

export interface PositionAsset {
  id: string;
  name: string;
  symbol: string;
  iconUrl: string | null;
  verified: boolean;
  /** Where the token lives per chain; native coins have an empty address. */
  implementations: { chainId: string; address: string }[];
}

export interface Position {
  id: string;
  name: string;
  type: PositionType;
  value: number | null;
  quantity: number;
  price: number | null;
  relativeChange24h: number;
  chainId: string;
  dappId: string | null;
  asset: PositionAsset;
}

export type AggregatedPosition = Position & {
  chainIds: string[];
};

export interface SearchAsset {
  id: string;
  name: string;
  symbol: string;
  iconUrl: string | null;
  price: number | null;
  relativeChange1d: number | null;
  marketCap: number | null;
}

export interface SearchWallet {
  address: string;
  name: string | null;
  iconUrl: string | null;
}

export type OperationType = import("./api").ApiOperationType;

export type TransactionStatus = "confirmed" | "failed" | "pending";

export type TransferDirection = "in" | "out" | "self";

export interface TransactionAsset {
  /** Fungible symbol or NFT contract + token id; transfers of the same asset share it. */
  id: string;
  name: string;
  symbol: string;
  iconUrl: string | null;
  isNft: boolean;
}

export interface TransactionTransfer {
  asset: TransactionAsset;
  direction: TransferDirection;
  quantity: number;
  value: number | null;
  sender: string;
  recipient: string;
}

export interface TransactionApproval {
  asset: TransactionAsset;
  quantity: number;
  unlimited: boolean;
}

export interface Transaction {
  id: string;
  hash: string;
  operationType: OperationType;
  status: TransactionStatus;
  chainId: string;
  /** ISO 8601; kept as a string so cached pages survive JSON serialization. */
  minedAt: string;
  block: number;
  nonce: number;
  sentFrom: string;
  sentTo: string;
  fee: { asset: TransactionAsset | null; quantity: number; value: number | null } | null;
  transfers: TransactionTransfer[];
  approvals: TransactionApproval[];
  dapp: { name: string; iconUrl: string | null; method: string | null } | null;
}
