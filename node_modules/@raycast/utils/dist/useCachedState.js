"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCachedState = void 0;
const react_1 = require("react");
const api_1 = require("@raycast/api");
const useLatest_1 = require("./useLatest");
const helpers_1 = require("./helpers");
const rootCache = Symbol("cache without namespace");
const cacheMap = new Map();
function useCachedState(key, initialState, config) {
    const cacheKey = config?.cacheNamespace || rootCache;
    const cache = cacheMap.get(cacheKey) || cacheMap.set(cacheKey, new api_1.Cache({ namespace: config?.cacheNamespace })).get(cacheKey);
    if (!cache) {
        throw new Error("Missing cache");
    }
    const keyRef = (0, useLatest_1.useLatest)(key);
    const initialValueRef = (0, useLatest_1.useLatest)(initialState);
    const cachedState = (0, react_1.useSyncExternalStore)(cache.subscribe, () => {
        try {
            return cache.get(keyRef.current);
        }
        catch (error) {
            console.error("Could not get Cache data:", error);
            return undefined;
        }
    });
    const state = (0, react_1.useMemo)(() => {
        if (typeof cachedState !== "undefined") {
            if (cachedState === "undefined") {
                return undefined;
            }
            try {
                return JSON.parse(cachedState, helpers_1.reviver);
            }
            catch (err) {
                // the data got corrupted somehow
                console.warn("The cached data is corrupted", err);
                return initialValueRef.current;
            }
        }
        else {
            return initialValueRef.current;
        }
    }, [cachedState, initialValueRef]);
    const stateRef = (0, useLatest_1.useLatest)(state);
    const setStateAndCache = (0, react_1.useCallback)((updater) => {
        // @ts-expect-error TS struggles to infer the types as T could potentially be a function
        const newValue = typeof updater === "function" ? updater(stateRef.current) : updater;
        if (typeof newValue === "undefined") {
            cache.set(keyRef.current, "undefined");
        }
        else {
            const stringifiedValue = JSON.stringify(newValue, helpers_1.replacer);
            cache.set(keyRef.current, stringifiedValue);
        }
        return newValue;
    }, [cache, keyRef, stateRef]);
    return [state, setStateAndCache];
}
exports.useCachedState = useCachedState;
