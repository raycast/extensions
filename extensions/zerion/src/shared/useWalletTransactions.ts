import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import {
  API_URL,
  getApiHeaders,
  parseApiResponse,
  type ApiFungibleInfo,
  type ApiNftInfo,
  type ApiTransaction,
  type ApiTransactionsResponse,
} from "./api";
import type { Transaction, TransactionAsset } from "./types";
import { ALL_CHAINS } from "./constants";

export const RECENT_ACTIVITY_SIZE = 2;
const HISTORY_PAGE_SIZE = 20;

// Approvals for "the max uint256" (or close to it) are unlimited in practice.
const UNLIMITED_APPROVAL_THRESHOLD = 1e30;

function mapAsset({
  fungible_info,
  nft_info,
}: {
  fungible_info?: ApiFungibleInfo;
  nft_info?: ApiNftInfo;
}): TransactionAsset {
  if (nft_info) {
    return {
      id: `${nft_info.contract_address}:${nft_info.token_id}`,
      name: nft_info.name,
      symbol: nft_info.name,
      iconUrl: nft_info.content?.preview?.url ?? nft_info.content?.detail?.url ?? null,
      isNft: true,
    };
  }
  return {
    id: fungible_info?.id ?? `${fungible_info?.symbol}:${fungible_info?.name}`,
    name: fungible_info?.name ?? "Unknown Asset",
    symbol: fungible_info?.symbol ?? "",
    iconUrl: fungible_info?.icon?.url ?? null,
    isNft: false,
  };
}

export function mapTransaction(transaction: ApiTransaction): Transaction {
  const { attributes, relationships } = transaction;
  const dapp = attributes.application_metadata;
  return {
    id: transaction.id,
    hash: attributes.hash,
    operationType: attributes.operation_type,
    status: attributes.status,
    chainId: relationships.chain.data.id,
    minedAt: attributes.mined_at,
    block: attributes.mined_at_block,
    nonce: attributes.nonce,
    sentFrom: attributes.sent_from,
    sentTo: attributes.sent_to,
    fee: attributes.fee
      ? {
          asset: attributes.fee.fungible_info ? mapAsset({ fungible_info: attributes.fee.fungible_info }) : null,
          quantity: attributes.fee.quantity.float,
          value: attributes.fee.value,
        }
      : null,
    transfers: attributes.transfers.map((transfer) => ({
      asset: mapAsset(transfer),
      direction: transfer.direction,
      quantity: transfer.quantity.float,
      value: transfer.value,
      sender: transfer.sender,
      recipient: transfer.recipient,
    })),
    approvals: attributes.approvals.map((approval) => ({
      asset: mapAsset(approval),
      quantity: approval.quantity.float,
      unlimited: approval.quantity.float >= UNLIMITED_APPROVAL_THRESHOLD,
    })),
    dapp: dapp?.name ? { name: dapp.name, iconUrl: dapp.icon?.url ?? null, method: dapp.method?.name ?? null } : null,
  };
}

function getTransactionsUrl({ address, chain, pageSize }: { address?: string; chain?: string; pageSize: number }) {
  const chainFilter = chain && chain !== ALL_CHAINS ? `&filter[chain_ids]=${encodeURIComponent(chain)}` : "";
  return `${API_URL}wallets/${address}/transactions/?currency=usd&filter[trash]=only_non_trash&page[size]=${pageSize}${chainFilter}`;
}

async function parseTransactions(response: Response) {
  return parseApiResponse<ApiTransactionsResponse>(response);
}

/** The latest few Transactions for the Wallet Overview's Recent Activity. */
export function useRecentTransactions({ address, chain }: { address?: string; chain?: string }) {
  const { data, isLoading, error } = useFetch<ApiTransactionsResponse, undefined, Transaction[]>(
    getTransactionsUrl({ address, chain, pageSize: RECENT_ACTIVITY_SIZE }),
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parseTransactions,
        mapResult: (result: ApiTransactionsResponse) => ({ data: result.data.map(mapTransaction) }),
        execute: Boolean(address),
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [address],
    ),
  );

  return { transactions: data, isLoading: Boolean(address) && isLoading, error };
}

/** The wallet's full History, newest first, loaded page by page via the API's `links.next` cursor. */
export function useWalletTransactions({ address, chain }: { address?: string; chain?: string }) {
  const firstPageUrl = getTransactionsUrl({ address, chain, pageSize: HISTORY_PAGE_SIZE });
  const { data, isLoading, error, pagination } = useFetch(
    useMemo(
      () =>
        ({ cursor }: { cursor?: string }) =>
          cursor ?? firstPageUrl,
      [firstPageUrl],
    ),
    {
      headers: getApiHeaders(),
      parseResponse: parseTransactions,
      mapResult: (result: ApiTransactionsResponse) => ({
        data: result.data.map(mapTransaction),
        hasMore: Boolean(result.links.next),
        cursor: result.links.next,
      }),
      execute: Boolean(address),
      keepPreviousData: true,
      onError: (error: Error) => {
        console.error(error);
      },
    },
  );

  return { transactions: data, isLoading: Boolean(address) && isLoading, error, pagination };
}
