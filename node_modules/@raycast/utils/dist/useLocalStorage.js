"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalStorage = void 0;
const api_1 = require("@raycast/api");
const showFailureToast_1 = require("./showFailureToast");
const helpers_1 = require("./helpers");
const usePromise_1 = require("./usePromise");
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
function useLocalStorage(key, initialValue) {
    const { data: value, isLoading, mutate, } = (0, usePromise_1.usePromise)(async (storageKey) => {
        const item = await api_1.LocalStorage.getItem(storageKey);
        return typeof item !== "undefined" ? JSON.parse(item, helpers_1.reviver) : initialValue;
    }, [key]);
    async function setValue(value) {
        try {
            await mutate(api_1.LocalStorage.setItem(key, JSON.stringify(value, helpers_1.replacer)), {
                optimisticUpdate(value) {
                    return value;
                },
            });
        }
        catch (error) {
            await (0, showFailureToast_1.showFailureToast)(error, { title: "Failed to set value in local storage" });
        }
    }
    async function removeValue() {
        try {
            await mutate(api_1.LocalStorage.removeItem(key), {
                optimisticUpdate() {
                    return undefined;
                },
            });
        }
        catch (error) {
            await (0, showFailureToast_1.showFailureToast)(error, { title: "Failed to remove value from local storage" });
        }
    }
    return { value, setValue, removeValue, isLoading };
}
exports.useLocalStorage = useLocalStorage;
