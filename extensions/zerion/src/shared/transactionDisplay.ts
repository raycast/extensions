import { Color, Icon } from "@raycast/api";
import type { OperationType, Transaction, TransactionAsset, TransactionTransfer, ChainInfo } from "./types";
import { minus } from "./typography";
import { middleTruncate } from "./utils";

const OPERATION_DISPLAY: Record<OperationType, { title: string; icon: Icon; color: Color }> = {
  approve: { title: "Approved", icon: Icon.Lock, color: Color.Blue },
  bid: { title: "Bid", icon: Icon.Hammer, color: Color.Purple },
  burn: { title: "Burned", icon: Icon.Trash, color: Color.Red },
  claim: { title: "Claimed", icon: Icon.Gift, color: Color.Green },
  delegate: { title: "Delegated", icon: Icon.TwoPeople, color: Color.Blue },
  deploy: { title: "Deployed", icon: Icon.Rocket, color: Color.Purple },
  deposit: { title: "Deposited", icon: Icon.Download, color: Color.Blue },
  execute: { title: "Executed", icon: Icon.Terminal, color: Color.SecondaryText },
  mint: { title: "Minted", icon: Icon.Stars, color: Color.Green },
  receive: { title: "Received", icon: Icon.ArrowDown, color: Color.Green },
  revoke: { title: "Revoked", icon: Icon.LockUnlocked, color: Color.Orange },
  revoke_delegation: { title: "Revoked Delegation", icon: Icon.RemovePerson, color: Color.Orange },
  send: { title: "Sent", icon: Icon.ArrowUp, color: Color.Blue },
  trade: { title: "Traded", icon: Icon.Switch, color: Color.Purple },
  withdraw: { title: "Withdrew", icon: Icon.Upload, color: Color.Blue },
};

export function getOperationDisplay(operationType: OperationType) {
  return (
    OPERATION_DISPLAY[operationType] ?? {
      title: operationType.charAt(0).toUpperCase() + operationType.slice(1).replace(/_/g, " "),
      icon: Icon.Circle,
      color: Color.SecondaryText,
    }
  );
}

export function formatQuantity(quantity: number) {
  const abs = Math.abs(quantity);
  if (abs === 0) {
    return "0";
  }
  if (abs < 0.000001) {
    return "<0.000001";
  }
  if (abs >= 1e6) {
    return abs.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
  }
  return abs.toLocaleString(
    "en-US",
    abs >= 1 ? { maximumFractionDigits: abs >= 1000 ? 2 : 4 } : { maximumSignificantDigits: 4 },
  );
}

export function formatFiat(value: number) {
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.01) {
    return "<$0.01";
  }
  return `$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** An asset's aggregated movement (or approval) on one side of a Transaction. */
export interface Flow {
  asset: TransactionAsset;
  direction: "in" | "out" | "self" | "approval";
  quantity: number;
  value: number | null;
  unlimited?: boolean;
}

function aggregateTransfers(transfers: TransactionTransfer[]): Flow[] {
  const byAsset = new Map<string, Flow>();
  for (const transfer of transfers) {
    const existing = byAsset.get(transfer.asset.id);
    if (existing) {
      existing.quantity += transfer.quantity;
      existing.value =
        existing.value == null && transfer.value == null ? null : (existing.value ?? 0) + (transfer.value ?? 0);
    } else {
      byAsset.set(transfer.asset.id, {
        asset: transfer.asset,
        direction: transfer.direction,
        quantity: transfer.quantity,
        value: transfer.value,
      });
    }
  }
  return [...byAsset.values()];
}

export function getFlowSign(flow: Flow) {
  return flow.direction === "in" ? "+" : flow.direction === "out" ? minus : "";
}

export function formatFlow(flow: Flow) {
  if (flow.direction === "approval") {
    return `${flow.unlimited ? "Unlimited" : formatQuantity(flow.quantity)} ${flow.asset.symbol}`;
  }
  const amount = flow.asset.isNft && flow.quantity === 1 ? "" : `${formatQuantity(flow.quantity)} `;
  return `${getFlowSign(flow)}${amount}${flow.asset.symbol}`;
}

/** Transfers split by direction, each aggregated per asset. */
export function getTransactionFlows(transaction: Transaction) {
  const incoming = aggregateTransfers(transaction.transfers.filter(({ direction }) => direction === "in"));
  const outgoing = aggregateTransfers(transaction.transfers.filter(({ direction }) => direction === "out"));
  const self = aggregateTransfers(transaction.transfers.filter(({ direction }) => direction === "self"));
  const approvals: Flow[] = transaction.approvals.map((approval) => ({
    asset: approval.asset,
    direction: "approval",
    quantity: approval.quantity,
    value: null,
    unlimited: approval.unlimited,
  }));
  return { incoming, outgoing, self, approvals };
}

/**
 * Mirrors the web app's OverviewAction: the leading side (incoming, or outgoing for deposits) is primary,
 * the trailing side is secondary only when both exist; approvals are the fallback when nothing moved.
 */
export function getPrimaryAndSecondaryFlows(transaction: Transaction): { primary: Flow[]; secondary: Flow[] } {
  const { incoming, outgoing, self, approvals } = getTransactionFlows(transaction);
  const [leading, trailing] = transaction.operationType === "deposit" ? [outgoing, incoming] : [incoming, outgoing];
  if (leading.length && trailing.length) {
    return { primary: leading, secondary: trailing };
  }
  const primary = leading.length ? leading : trailing.length ? trailing : self.length ? self : approvals;
  return { primary, secondary: [] };
}

/** The other party of a plain send or receive, used when there is no dapp to name. */
export function getCounterparty(transaction: Transaction): { label: "to" | "from"; address: string } | null {
  if (transaction.operationType === "send") {
    const address = transaction.transfers.find(({ direction }) => direction === "out")?.recipient ?? transaction.sentTo;
    return address ? { label: "to", address } : null;
  }
  if (transaction.operationType === "receive") {
    const address = transaction.transfers.find(({ direction }) => direction === "in")?.sender ?? transaction.sentFrom;
    return address ? { label: "from", address } : null;
  }
  return null;
}

export function truncateAddress(address: string) {
  return middleTruncate({ value: address, leadingLettersCount: 6, trailingLettersCount: 4 });
}

export function getExplorerUrl({
  transaction,
  chain,
  walletAddress,
}: {
  transaction: Transaction;
  chain: ChainInfo;
  walletAddress: string;
}) {
  return chain.txUrlFormat
    ? chain.txUrlFormat.replace("{HASH}", transaction.hash)
    : `https://app.zerion.io/${walletAddress}/history`;
}

export function getTransactionKeywords(transaction: Transaction) {
  const { title } = getOperationDisplay(transaction.operationType);
  const symbols = [...transaction.transfers, ...transaction.approvals].flatMap(({ asset }) => [
    asset.symbol,
    asset.name,
  ]);
  const counterparty = getCounterparty(transaction);
  return [
    title,
    transaction.operationType,
    ...symbols,
    transaction.dapp?.name,
    counterparty?.address,
    transaction.hash,
  ].filter(Boolean) as string[];
}

export function getDaySectionTitle(minedAt: string, now = new Date()) {
  const date = new Date(minedAt);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (daysAgo === 0) {
    return "Today";
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
