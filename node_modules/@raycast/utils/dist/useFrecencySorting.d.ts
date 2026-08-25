/**
 * Sort an array by its frecency and provide methods to update the frecency of its items.
 * Frecency is a measure that combines frequency and recency. The more often an item is visited/used, and the more recently an item is visited/used, the higher it will rank.
 *
 * @example
 * ```
 * import { List, ActionPanel, Action, Icon } from "@raycast/api";
 * import { useFetch, useFrecencySorting } from "@raycast/utils";
 *
 * export default function Command() {
 *   const { isLoading, data } = useFetch("https://api.example");
 *   const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data);
 *
 *   return (
 *     <List isLoading={isLoading}>
 *       {sortedData.map((item) => (
 *         <List.Item
 *           key={item.id}
 *           title={item.title}
 *           actions={
 *             <ActionPanel>
 *               <Action.OpenInBrowser url={item.url} onOpen={() => visitItem(item)} />
 *               <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => visitItem(item)} />
 *               <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
 *             </ActionPanel>
 *           }
 *         />
 *       ))}
 *     </List>
 *   );
 * };
 * ```
 */
export declare function useFrecencySorting<T extends {
    id: string;
}>(data?: T[], options?: {
    namespace?: string;
    key?: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
}): {
    data: T[];
    visitItem: (item: T) => Promise<void>;
    resetRanking: (item: T) => Promise<void>;
};
export declare function useFrecencySorting<T>(data: T[] | undefined, options: {
    namespace?: string;
    key: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
}): {
    data: T[];
    visitItem: (item: T) => Promise<void>;
    resetRanking: (item: T) => Promise<void>;
};
//# sourceMappingURL=useFrecencySorting.d.ts.map