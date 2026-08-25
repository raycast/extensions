/**
 * Returns the latest state.
 *
 * This is mostly useful to get access to the latest value of some props or state inside an asynchronous callback, instead of that value at the time the callback was created from.
 */
export declare function useLatest<T>(value: T): {
    readonly current: T;
};
//# sourceMappingURL=useLatest.d.ts.map