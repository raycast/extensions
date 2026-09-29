import { List, Color, Icon, Image, ActionPanel, Action, Keyboard } from "@raycast/api";
import type { ReactNode } from "react";
import type { ChainInfo, Transaction } from "../shared/types";
import { getChainInfo } from "../shared/useChains";
import {
  formatFiat,
  formatFlow,
  formatQuantity,
  getCounterparty,
  getExplorerUrl,
  getFlowSign,
  getOperationDisplay,
  getPrimaryAndSecondaryFlows,
  getTransactionFlows,
  getTransactionKeywords,
  truncateAddress,
  type Flow,
} from "../shared/transactionDisplay";
import { AddressView } from "./AddressView";

function getAssetIcon(flow: Flow): Image.ImageLike {
  return {
    source: flow.asset.iconUrl || (flow.asset.isNft ? Icon.Image : Icon.Coins),
    mask: flow.asset.isNft ? Image.Mask.RoundedRectangle : Image.Mask.Circle,
  };
}

function getFlowLine(flow: Flow) {
  return flow.value != null && flow.direction !== "approval"
    ? `${formatFlow(flow)} (${formatFiat(flow.value)})`
    : formatFlow(flow);
}

function getFlowColor(flow: Flow, dimmed: boolean) {
  if (dimmed) {
    return Color.SecondaryText;
  }
  return flow.direction === "in" ? Color.Green : Color.PrimaryText;
}

function getFlowAccessory(flows: Flow[], dimmed: boolean): List.Item.Accessory | null {
  if (!flows.length) {
    return null;
  }
  if (flows.length === 1) {
    const [flow] = flows;
    return {
      icon: getAssetIcon(flow),
      text: { value: formatFlow(flow), color: getFlowColor(flow, dimmed) },
      tooltip: getFlowLine(flow),
    };
  }
  return {
    icon: Icon.Coins,
    text: { value: `${getFlowSign(flows[0])}${flows.length} assets`, color: getFlowColor(flows[0], dimmed) },
    tooltip: flows.map(getFlowLine).join("\n"),
  };
}

function formatDateTime(minedAt: string) {
  const date = new Date(minedAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function getAccessories({
  transaction,
  chain,
  dateStyle,
  compact,
}: {
  transaction: Transaction;
  chain: ChainInfo;
  dateStyle: "relative" | "time";
  compact: boolean;
}): List.Item.Accessory[] {
  const dimmed = transaction.status === "failed";
  const { primary, secondary } = getPrimaryAndSecondaryFlows(transaction);
  const statusTag: List.Item.Accessory | null =
    transaction.status === "failed"
      ? { tag: { value: "Failed", color: Color.Red } }
      : transaction.status === "pending"
        ? { tag: { value: "Pending", color: Color.Orange } }
        : null;

  if (compact) {
    return [statusTag, getFlowAccessory(primary, dimmed)].filter(Boolean) as List.Item.Accessory[];
  }

  const [singleFlow] = primary;
  const valueAccessory: List.Item.Accessory | null =
    primary.length === 1 && !secondary.length && singleFlow.direction !== "approval" && singleFlow.value != null
      ? { text: { value: formatFiat(singleFlow.value), color: Color.SecondaryText } }
      : null;

  const date = new Date(transaction.minedAt);
  const dateAccessory: List.Item.Accessory | null =
    transaction.status === "pending" || Number.isNaN(date.getTime())
      ? null
      : dateStyle === "relative"
        ? { date, tooltip: formatDateTime(transaction.minedAt) }
        : {
            text: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            tooltip: formatDateTime(transaction.minedAt),
          };

  return [
    transaction.status === "failed" ? statusTag : null,
    getFlowAccessory(primary, dimmed),
    getFlowAccessory(secondary, dimmed) ?? valueAccessory,
    { icon: { source: chain.iconUrl || Icon.ComputerChip, mask: Image.Mask.RoundedRectangle }, tooltip: chain.name },
    transaction.status === "pending" ? statusTag : dateAccessory,
  ].filter(Boolean) as List.Item.Accessory[];
}

function renderFlowsMetadata(title: string, flows: Flow[]) {
  return flows.map((flow, index) => (
    <List.Item.Detail.Metadata.Label
      key={`${title}-${flow.asset.id}`}
      title={index === 0 ? title : ""}
      icon={getAssetIcon(flow)}
      text={
        flow.value != null && flow.direction !== "approval"
          ? `${formatFlow(flow)} · ${formatFiat(flow.value)}`
          : formatFlow(flow)
      }
    />
  ));
}

function getExplorerName(explorerUrl: string) {
  try {
    return new URL(explorerUrl).hostname;
  } catch {
    return "Explorer";
  }
}

function TransactionDetail({
  transaction,
  chain,
  explorerUrl,
}: {
  transaction: Transaction;
  chain: ChainInfo;
  explorerUrl: string;
}) {
  const display = getOperationDisplay(transaction.operationType);
  const { incoming, outgoing, self, approvals } = getTransactionFlows(transaction);
  const hasFlows = incoming.length + outgoing.length + self.length + approvals.length > 0;
  const { fee } = transaction;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title={display.title}>
            <List.Item.Detail.Metadata.TagList.Item
              text={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              color={
                transaction.status === "failed"
                  ? Color.Red
                  : transaction.status === "pending"
                    ? Color.Orange
                    : Color.Green
              }
            />
          </List.Item.Detail.Metadata.TagList>
          {hasFlows ? <List.Item.Detail.Metadata.Separator /> : null}
          {renderFlowsMetadata("Received", incoming)}
          {renderFlowsMetadata("Sent", outgoing)}
          {renderFlowsMetadata("Moved", self)}
          {renderFlowsMetadata("Approved", approvals)}
          <List.Item.Detail.Metadata.Separator />
          {transaction.dapp ? (
            <List.Item.Detail.Metadata.Label
              title="Dapp"
              text={
                transaction.dapp.method
                  ? `${transaction.dapp.name} · ${transaction.dapp.method}`
                  : transaction.dapp.name
              }
              icon={
                transaction.dapp.iconUrl
                  ? { source: transaction.dapp.iconUrl, mask: Image.Mask.RoundedRectangle }
                  : undefined
              }
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Chain"
            text={chain.name}
            icon={{ source: chain.iconUrl || Icon.ComputerChip, mask: Image.Mask.RoundedRectangle }}
          />
          {fee ? (
            <List.Item.Detail.Metadata.Label
              title="Fee"
              text={[
                `${formatQuantity(fee.quantity)} ${fee.asset?.symbol ?? ""}`.trim(),
                fee.value != null ? formatFiat(fee.value) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label title="From" text={truncateAddress(transaction.sentFrom)} />
          <List.Item.Detail.Metadata.Label title="To" text={truncateAddress(transaction.sentTo)} />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDateTime(transaction.minedAt)} />
          {transaction.block ? (
            <List.Item.Detail.Metadata.Label title="Block" text={String(transaction.block)} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Nonce" text={String(transaction.nonce)} />
          <List.Item.Detail.Metadata.Label title="Hash" text={truncateAddress(transaction.hash)} />
          <List.Item.Detail.Metadata.Link
            title="Explorer"
            text={chain.txUrlFormat ? getExplorerName(explorerUrl) : "Zerion Web App"}
            target={explorerUrl}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function TransactionItem({
  transaction,
  walletAddress,
  chainsById,
  dateStyle,
  isShowingDetail = false,
  detailAction,
}: {
  transaction: Transaction;
  walletAddress: string;
  chainsById: Record<string, ChainInfo>;
  /** Relative dates for Recent Activity; History rows sit under day sections and show the time. */
  dateStyle: "relative" | "time";
  isShowingDetail?: boolean;
  detailAction?: ReactNode;
}) {
  const chain = getChainInfo(chainsById, transaction.chainId);
  const display = getOperationDisplay(transaction.operationType);
  const counterparty = getCounterparty(transaction);
  const explorerUrl = getExplorerUrl({ transaction, chain, walletAddress });

  return (
    <List.Item
      id={transaction.id}
      icon={{ value: { source: display.icon, tintColor: display.color }, tooltip: transaction.operationType }}
      title={display.title}
      subtitle={
        isShowingDetail
          ? undefined
          : (transaction.dapp?.name ??
            (counterparty ? `${counterparty.label} ${truncateAddress(counterparty.address)}` : undefined))
      }
      keywords={getTransactionKeywords(transaction)}
      accessories={getAccessories({ transaction, chain, dateStyle, compact: isShowingDetail })}
      detail={
        isShowingDetail ? (
          <TransactionDetail transaction={transaction} chain={chain} explorerUrl={explorerUrl} />
        ) : undefined
      }
      actions={
        <ActionPanel title={display.title}>
          {/* Enter reveals the drawer first; once it is open, Enter goes to the explorer */}
          {isShowingDetail ? null : detailAction}
          <Action.OpenInBrowser
            url={explorerUrl}
            title={chain.txUrlFormat ? "Open in Explorer" : "Open in Zerion Web App"}
            icon={Icon.Globe}
          />
          {isShowingDetail ? detailAction : null}
          <Action.CopyToClipboard
            title="Copy Transaction Hash"
            content={transaction.hash}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {counterparty ? (
            <>
              <Action.CopyToClipboard
                title="Copy Counterparty Address"
                content={counterparty.address}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              <Action.Push
                title="Open Counterparty Wallet"
                icon={Icon.Wallet}
                shortcut={Keyboard.Shortcut.Common.Open}
                target={<AddressView addressOrDomain={counterparty.address} />}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
