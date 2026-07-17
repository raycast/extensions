import { MempoolBlock } from "./types";

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
