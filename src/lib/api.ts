import {
  MempoolBlock,
  BlockResult,
  ExactResult,
  EstimatedResult,
} from "./types";

export async function fetchBlock(height: number): Promise<MempoolBlock> {
  const hashRes = await fetch(
    `https://mempool.space/api/block-height/${height}`,
  );
  if (!hashRes.ok) {
    throw new Error(`Block height ${height} not found (${hashRes.status})`);
  }
  const hash = await hashRes.text();
  const blockRes = await fetch(`https://mempool.space/api/block/${hash}`);
  if (!blockRes.ok) {
    throw new Error(`Failed to fetch block ${hash} (${blockRes.status})`);
  }
  return blockRes.json();
}

export async function fetchLatestBlock(): Promise<MempoolBlock> {
  const hashRes = await fetch("https://mempool.space/api/blocks/tip/hash");
  if (!hashRes.ok) {
    throw new Error(`Failed to fetch chain tip (${hashRes.status})`);
  }
  const hash = await hashRes.text();
  const blockRes = await fetch(`https://mempool.space/api/block/${hash}`);
  if (!blockRes.ok) {
    throw new Error(`Failed to fetch latest block (${blockRes.status})`);
  }
  return blockRes.json();
}

function estimateTime(reference: MempoolBlock, targetHeight: number): number {
  const blocksAhead = targetHeight - reference.height;
  return reference.timestamp + blocksAhead * 600;
}

export async function resolveBlock(height: number): Promise<BlockResult> {
  try {
    const block = await fetchBlock(height);
    return { kind: "exact", block } as ExactResult;
  } catch {
    const latest = await fetchLatestBlock();
    if (height > latest.height) {
      const timestamp = estimateTime(latest, height);
      return { kind: "estimate", height, timestamp } as EstimatedResult;
    }
    throw new Error(`Block height ${height} not found`);
  }
}
