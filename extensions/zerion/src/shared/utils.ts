import groupBy from "lodash/groupBy";
import type { AggregatedPosition, Position } from "./types";
import { ellipsis } from "./typography";
import { LocalStorage } from "@raycast/api";
import BigNumber from "bignumber.js";
import { ADDRESSES_KEY, MENU_BAR_ADDRESS_KEY } from "./constants";
import type { NormalizedAddress } from "./NormalizedAddress";

export const middleTruncate = ({
  value,
  leadingLettersCount = 3,
  trailingLettersCount = 6,
}: {
  value: string;
  leadingLettersCount?: number;
  trailingLettersCount?: number;
}) =>
  value.length > leadingLettersCount + trailingLettersCount
    ? `${value.slice(0, leadingLettersCount)}${ellipsis}${value.slice(-trailingLettersCount)}`
    : value;

export function getPositionValue(position: Position) {
  return Number(position.value) || 0;
}

// we need to sum up all values, except loan values
export function getFullPositionsValue(positions?: Position[] | null) {
  return positions
    ? positions.reduce(
        (acc, item) => (item.type === "loan" ? acc - getPositionValue(item) : acc + getPositionValue(item)),
        0,
      )
    : 0;
}

export function getFullPositionsBalance(positions?: Position[] | null) {
  const zero = new BigNumber(0);
  return positions
    ? positions.reduce(
        (acc, position) =>
          position.type === "loan" ? acc.minus(getPositionBalance(position)) : acc.plus(getPositionBalance(position)),
        zero,
      )
    : zero;
}

function createAggregatedPosition(positions: Position[]): AggregatedPosition {
  return {
    asset: positions[0].asset,
    id: positions[0].asset.id,
    name: positions[0].name,
    chain: positions[0].chain,
    apy: null,
    dapp: null,
    protocol: null,
    isDisplayable: true,
    includedInChart: false,
    parentId: null,
    type: "asset",
    chains: [...new Set(positions.map(({ chain }) => chain))],
    value: getFullPositionsValue(positions).toString(),
    normalizedQuantity: getFullPositionsBalance(positions).toFixed(),
    // tokens can have different decimals across different chains
    quantity: "0",
  };
}

export function groupPositionsByToken(positions: Position[]): AggregatedPosition[] {
  const aggregatedPositions = groupBy<Position>(positions || [], (position) => position.asset.id);
  return Object.values(aggregatedPositions).map((assetPositions) => createAggregatedPosition(assetPositions));
}

function toCommon(value: string | number, decimals?: number): BigNumber {
  return new BigNumber(value).shiftedBy(0 - (decimals || 0));
}

export function getPositionBalance(position: Position | AggregatedPosition) {
  if ("normalizedQuantity" in position) {
    return new BigNumber(position.normalizedQuantity);
  }
  return toCommon(position.quantity || 0, position.asset.implementations?.[position.chain.id]?.decimals);
}

export const DEFAULT_DAPP_ID = "wallet";

export function groupPositionsByDapp(positions?: Position[]) {
  return groupBy<Position>(positions || [], (position) => position.dapp?.id || DEFAULT_DAPP_ID);
}

export function sortPositionGroupsByTotalValue(positionGroups?: Record<string, Position[] | undefined>) {
  return Object.entries(positionGroups || {}).sort((a, b) => getFullPositionsValue(b[1]) - getFullPositionsValue(a[1]));
}

export async function getAddresses() {
  const addressesRaw = await LocalStorage.getItem(ADDRESSES_KEY);
  return JSON.parse((addressesRaw || "[]") as string) as NormalizedAddress[];
}

export async function setAddresses(addresses: NormalizedAddress[]) {
  return LocalStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
}

export async function addAddress(address: NormalizedAddress) {
  const addresses = await getAddresses();
  if (addresses.includes(address)) {
    return addresses;
  }
  const result = [...addresses, address];
  await setAddresses(result);
  return result;
}

export async function removeAddress(address: NormalizedAddress) {
  const addresses = await getAddresses();
  const barAddress = await LocalStorage.getItem("main-address");
  if (barAddress === address) {
    await LocalStorage.removeItem(MENU_BAR_ADDRESS_KEY);
  }
  if (!addresses.includes(address)) {
    return addresses;
  }
  const index = addresses.findIndex((item) => address === item);
  const result = [...addresses.slice(0, index), ...addresses.slice(index + 1)];
  await setAddresses(result);
  return result;
}

export async function setMenuBarAddress(address: NormalizedAddress) {
  return LocalStorage.setItem(MENU_BAR_ADDRESS_KEY, address);
}

export async function getMenuBarAddress() {
  const menuBarAddress = await LocalStorage.getItem(MENU_BAR_ADDRESS_KEY);
  return menuBarAddress ? (menuBarAddress as NormalizedAddress) : null;
}

export async function removeMenuBarAddress() {
  return LocalStorage.removeItem(MENU_BAR_ADDRESS_KEY);
}

export function getSignificantValue(value: number, powShift = 0): [number, string] {
  const shiftedValue = value / 10 ** powShift;
  if (shiftedValue >= 1e12) {
    return [value / 1e12, "T"];
  }
  if (shiftedValue >= 1e9) {
    return [value / 1e9, "B"];
  }
  if (shiftedValue >= 1e6) {
    return [value / 1e6, "M"];
  }
  if (shiftedValue >= 1e3) {
    return [value / 1e3, "K"];
  }
  return [value, ""];
}

export function formatWithSignificantValue(value: number) {
  const [significantValue, symbol] = getSignificantValue(value);
  return `${Math.floor(significantValue)}${symbol}`;
}
