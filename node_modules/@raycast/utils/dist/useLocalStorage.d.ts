/**
 * A hook to manage a value in the local storage.
 *
 * @remark The value is stored as a JSON string in the local storage.
 *
 * @param key - The key to use for the value in the local storage.
 * @param initialValue - The initial value to use if the key doesn't exist in the local storage.
 * @returns An object with the following properties:
 * - `value`: The value from the local storage or the initial value if the key doesn't exist.
 * - `setValue`: A function to update the value in the local storage.
 * - `removeValue`: A function to remove the value from the local storage.
 * - `isLoading`: A boolean indicating if the value is loading.
 *
 * @example
 * ```
 * const { value, setValue } = useLocalStorage<string>("my-key");
 * const { value, setValue } = useLocalStorage<string>("my-key", "default value");
 * ```
 */
export declare function useLocalStorage<T>(key: string, initialValue?: T): {
    value: Awaited<T> | undefined;
    setValue: (value: T) => Promise<void>;
    removeValue: () => Promise<void>;
    isLoading: boolean;
};
//# sourceMappingURL=useLocalStorage.d.ts.map