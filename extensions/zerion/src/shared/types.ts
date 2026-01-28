type WalletMetaNFT = {
  chain: string;
  contractAddress: string;
  tokenId: string;
  metadata: {
    name: string | null;
    content: {
      imagePreviewUrl?: string;
      imageUrl?: string | null;
      audioUrl?: string | null;
      videoUrl?: string | null;
      type: "video" | "image" | "audio";
    } | null;
  } | null;
};

export type PremiumPlan = "Single" | "Bundle" | "Restricted" | "Bundle (Child)";
interface MigrationToken {
  generation: "Zero" | "G1" | "OnePointO";
  id: string;
  premium: {
    expirationTime: string;
    features: {
      feeWaiver: boolean;
      csv: boolean;
      pnl: boolean;
      perks: boolean;
      earlyAccess: boolean;
    };
    plan: PremiumPlan;
  } | null;
}

export type ParentToken = MigrationToken & {
  owner: string;
};

interface WalletMetaMembership {
  parentTokens: ParentToken[] | null;
  premium: MigrationToken["premium"] | null;
  tokens: MigrationToken[] | null;
}

export interface Identity {
  provider: "ens" | "lens" | "ud" | "unspecified";
  address: string;
  handle: string;
}

export type WalletMetadata = {
  address: string;
  nft: WalletMetaNFT | null;
  nftMetaInformation: {
    onboarded: boolean;
  } | null;
  identities: Identity[];
  membership: WalletMetaMembership & {
    level: number;
    levelProgressPercentage: number;
    levelFarmingLimit: number; // Limit for Active XP to reach at the current level
    levelFarmingIndex: number; // Active XP earned during the last level
    levelUpTime: string;
    referralCode: string;
    levelCapacity: number;
    referralLink: string;
    referred: number;
    referrer: {
      referralCode: string;
      address: string;
      handle: string;
      nft: WalletMetaNFT | null;
    };
    retro: unknown | null;
    xp: {
      earned: number;
      locked: number;
      referred: number;
      claimable: number;
    };
    newRewards: number;
  };
};

export interface AddressPortfolio {
  positionsTypesDistribution: {
    assets: number;
    deposited: number;
    borrowed: number;
    locked: number;
    staked: number;
  };
  positionsChainsDistribution: Record<string, number>;
  nfts: {
    lastPrice: number;
    floorPrice: number;
  };
  change24h: {
    absolute: number;
    relative: number;
  };
  totalValue: number;
  chains: Record<string, ChainInfo>;
}

type PositionType = "asset" | "deposit" | "loan" | "reward" | "staked" | "locked";

interface Price {
  value: number;
  relativeChange24h: number;
  changedAt: number;
}

interface Asset {
  id: string;
  iconUrl: string | null;
  name: string;
  price: Price | null;
  symbol: string;
  isDisplayable: boolean;
  isVerified: boolean;
  implementations?: {
    [key: string]: {
      address: string | null;
      decimals: number;
    };
  };
}

interface AddressPositionDappInfo {
  id: string;
  name: string | null;
  url: string | null;
  iconUrl: string | null;
}

export interface ChainInfo {
  id: string;
  name: string;
  testnet: boolean;
  iconUrl: string;
}

export interface Position {
  apy: string | null;
  asset: Asset;
  chain: ChainInfo;
  id: string;
  includedInChart: boolean;
  name: string;
  parentId: string | null;
  protocol: string | null;
  quantity: string | null;
  type: PositionType;
  value: string | null;
  isDisplayable: boolean;
  dapp: AddressPositionDappInfo | null;
}

export type AggregatedPosition = Position & {
  chains: Position["chain"][];
  normalizedQuantity: string;
};

export type SearchAsset = {
  id: string;
  name: string;
  symbol: string;
  iconUrl: string;
  meta: {
    price: number;
    marketCap: number;
    relativeChange1d: number;
    relativeChange30d: number;
    relativeChange90d: number;
  };
};

export type SearchWallet = {
  name: string;
  iconUrl: string;
  address: string;
  premium: boolean;
};

type SearchDapp = {
  name: string;
  iconUrl: string;
  url: string;
};

export type SearchResult = {
  dapps: SearchDapp[];
  fungibles: SearchAsset[];
  wallets: SearchWallet[];
};
