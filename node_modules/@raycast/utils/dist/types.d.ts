export type PaginationOptions<T = any> = {
    /**
     * Specifies the current page index. Zero-based.
     */
    page: number;
    /**
     * The last item from the previous page of results, useful for APIs implementing cursor-based pagination.
     */
    lastItem?: Flatten<T>;
    /**
     * Some APIs don't use the last returned item as a cursor, but instead provide the next cursor explicitly. In those cases,
     * you can pass `cursor` along with `data` and `hasMore`, and it will be included in each pagination call.
     */
    cursor?: any;
};
export type FunctionReturningPromise<T extends any[] = any[], U = any> = (...args: T) => Promise<U>;
export type FunctionReturningPaginatedPromise<T extends any[] = any[], U extends any[] = any[]> = (...args: T) => (pagination: PaginationOptions<U>) => Promise<{
    data: U;
    hasMore?: boolean;
    cursor?: any;
}>;
export type UnwrapReturn<T extends FunctionReturningPromise | FunctionReturningPaginatedPromise> = T extends FunctionReturningPromise ? Awaited<ReturnType<T>> : T extends FunctionReturningPaginatedPromise ? Awaited<ReturnType<ReturnType<T>>>["data"] : never;
export type Flatten<T> = T extends Array<infer U> ? U : T;
export type AsyncState<T> = {
    isLoading: boolean;
    error?: undefined;
    data?: undefined;
} | {
    isLoading: true;
    error?: Error | undefined;
    data?: T;
} | {
    isLoading: false;
    error: Error;
    data?: undefined;
} | {
    isLoading: false;
    error?: undefined;
    data: T;
};
/**
 * Function to wrap an asynchronous update and gives some control about how the
 * hook's data should be updated while the update is going through.
 *
 * By default, the data will be revalidated (eg. the function will be called again)
 * after the update is done.
 *
 * **Optimistic Update**
 *
 * In an optimistic update, the UI behaves as though a change was successfully
 * completed before receiving confirmation from the server that it actually was -
 * it is being optimistic that it will eventually get the confirmation rather than an error.
 * This allows for a more responsive user experience.
 *
 * You can specify an `optimisticUpdate` function to mutate the data in order to reflect
 * the change introduced by the asynchronous update.
 *
 * When doing so, you can specify a `rollbackOnError` function to mutate back the
 * data if the asynchronous update fails. If not specified, the data will be automatically
 * rolled back to its previous value (before the optimistic update).
 */
export type MutatePromise<T, U = T, V = any> = (asyncUpdate?: Promise<V>, options?: {
    optimisticUpdate?: (data: T | U) => T;
    rollbackOnError?: boolean | ((data: T | U) => T);
    shouldRevalidateAfter?: boolean;
}) => Promise<V>;
export type UsePromiseReturnType<T> = AsyncState<T> & {
    /**
     * Pagination information that can be passed to `List` or `Grid`.
     */
    pagination?: {
        pageSize: number;
        hasMore: boolean;
        onLoadMore: () => void;
    };
    /**
     * Function to manually call the function again
     */
    revalidate: () => Promise<T>;
    /**
     * Function to wrap an asynchronous update and gives some control about how the
     * hook's data should be updated while the update is going through.
     *
     * By default, the data will be revalidated (eg. the function will be called again)
     * after the update is done.
     *
     * **Optimistic Update**
     *
     * In an optimistic update, the UI behaves as though a change was successfully
     * completed before receiving confirmation from the server that it actually was -
     * it is being optimistic that it will eventually get the confirmation rather than an error.
     * This allows for a more responsive user experience.
     *
     * You can specify an `optimisticUpdate` function to mutate the data in order to reflect
     * the change introduced by the asynchronous update.
     *
     * When doing so, you can specify a `rollbackOnError` function to mutate back the
     * data if the asynchronous update fails. If not specified, the data will be automatically
     * rolled back to its previous value (before the optimistic update).
     */
    mutate: MutatePromise<T, undefined>;
};
export type UseCachedPromiseReturnType<T, U> = AsyncState<T> & {
    /**
     * Pagination information that can be passed to `List` or `Grid`.
     */
    pagination?: {
        pageSize: number;
        hasMore: boolean;
        onLoadMore: () => void;
    };
    data: T | U;
    /**
     * Function to manually call the function again
     */
    revalidate: () => void;
    /**
     * Function to wrap an asynchronous update and gives some control about how the
     * hook's data should be updated while the update is going through.
     *
     * By default, the data will be revalidated (eg. the function will be called again)
     * after the update is done.
     *
     * **Optimistic Update**
     *
     * In an optimistic update, the UI behaves as though a change was successfully
     * completed before receiving confirmation from the server that it actually was -
     * it is being optimistic that it will eventually get the confirmation rather than an error.
     * This allows for a more responsive user experience.
     *
     * You can specify an `optimisticUpdate` function to mutate the data in order to reflect
     * the change introduced by the asynchronous update.
     *
     * When doing so, you can specify a `rollbackOnError` function to mutate back the
     * data if the asynchronous update fails. If not specified, the data will be automatically
     * rolled back to its previous value (before the optimistic update).
     */
    mutate: MutatePromise<T | U>;
};
//# sourceMappingURL=types.d.ts.map