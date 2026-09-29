import { List, Icon, Action } from "@raycast/api";
import { useMemo, useState } from "react";
import type { ChainInfo, Transaction } from "../shared/types";
import { useChains } from "../shared/useChains";
import { useWalletTransactions } from "../shared/useWalletTransactions";
import { getDaySectionTitle } from "../shared/transactionDisplay";
import { ChainsSelector } from "./NetworkSelect";
import { TransactionItem } from "./TransactionItem";
import { ApiErrorGate } from "./ApiKeyGate";

function groupByDay(transactions: Transaction[]) {
  const sections: { title: string; transactions: Transaction[] }[] = [];
  for (const transaction of transactions) {
    const title = getDaySectionTitle(transaction.minedAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) {
      last.transactions.push(transaction);
    } else {
      sections.push({ title, transactions: [transaction] });
    }
  }
  return sections;
}

export function HistoryView({
  address,
  chains,
  initialChain,
  initialShowingDetail = false,
  initialSelectedId,
}: {
  address: string;
  /** Networks offered in the dropdown, same as on the Wallet Overview. */
  chains: ChainInfo[];
  initialChain: string;
  initialShowingDetail?: boolean;
  initialSelectedId?: string;
}) {
  const [chainFilter, setChainFilter] = useState(initialChain);
  const [isShowingDetail, setIsShowingDetail] = useState(initialShowingDetail);
  const { chainsById, isLoading: chainsAreLoading, error: chainsError } = useChains();
  const { transactions, isLoading, error, pagination } = useWalletTransactions({ address, chain: chainFilter });

  const sections = useMemo(() => groupByDay(transactions ?? []), [transactions]);

  const errorGate = ApiErrorGate({ error: error || chainsError });
  if (errorGate) {
    return errorGate;
  }

  const toggleDetailAction = (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => setIsShowingDetail((value) => !value)}
    />
  );

  return (
    <List
      navigationTitle="History"
      searchBarPlaceholder="Filter Transactions"
      isLoading={isLoading || chainsAreLoading}
      isShowingDetail={isShowingDetail && sections.length > 0}
      selectedItemId={initialSelectedId}
      pagination={pagination}
      searchBarAccessory={<ChainsSelector chains={chains} value={chainFilter} onChange={setChainFilter} />}
    >
      {!isLoading && sections.length === 0 ? <List.EmptyView icon={Icon.Clock} title="No Activity Yet" /> : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              walletAddress={address}
              chainsById={chainsById}
              dateStyle="time"
              isShowingDetail={isShowingDetail}
              detailAction={toggleDetailAction}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
