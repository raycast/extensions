export interface MempoolBlock {
  id: string;
  height: number;
  timestamp: number;
}

export interface ExactResult {
  kind: "exact";
  block: MempoolBlock;
}

export interface EstimatedResult {
  kind: "estimate";
  height: number;
  timestamp: number;
}

export type BlockResult = ExactResult | EstimatedResult;
