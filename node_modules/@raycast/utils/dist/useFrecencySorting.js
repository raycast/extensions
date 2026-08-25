"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFrecencySorting = void 0;
const react_1 = require("react");
const useLatest_1 = require("./useLatest");
const useCachedState_1 = require("./useCachedState");
const HALF_LIFE_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DECAY_RATE_CONSTANT = Math.log(2) / (HALF_LIFE_DAYS * MS_PER_DAY);
const VISIT_TYPE_POINTS = {
    Default: 100,
    Embed: 0,
    Bookmark: 140,
};
function getNewFrecency(item) {
    const now = Date.now();
    const lastVisited = item ? item.lastVisited : 0;
    const frecency = item ? item.frecency : 0;
    const visitAgeInDays = (now - lastVisited) / MS_PER_DAY;
    const currentVisitValue = VISIT_TYPE_POINTS.Default * Math.exp(-DECAY_RATE_CONSTANT * visitAgeInDays);
    const totalVisitValue = frecency + currentVisitValue;
    return {
        lastVisited: now,
        frecency: totalVisitValue,
    };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultKey = (item) => {
    if (process.env.NODE_ENV !== "production" &&
        (typeof item !== "object" || !item || !("id" in item) || typeof item.id != "string")) {
        throw new Error("Specify a key function or make sure your items have an 'id' property");
    }
    return item.id;
};
function useFrecencySorting(data, options) {
    const keyRef = (0, useLatest_1.useLatest)(options?.key || defaultKey);
    const sortUnvisitedRef = (0, useLatest_1.useLatest)(options?.sortUnvisited);
    const [storedFrecencies, setStoredFrecencies] = (0, useCachedState_1.useCachedState)(`raycast_frecency_${options?.namespace}`, {});
    const visitItem = (0, react_1.useCallback)(async function updateFrecency(item) {
        const itemKey = keyRef.current(item);
        setStoredFrecencies((storedFrecencies) => {
            const frecency = storedFrecencies[itemKey];
            const newFrecency = getNewFrecency(frecency);
            return {
                ...storedFrecencies,
                [itemKey]: newFrecency,
            };
        });
    }, [keyRef, setStoredFrecencies]);
    const resetRanking = (0, react_1.useCallback)(async function removeFrecency(item) {
        const itemKey = keyRef.current(item);
        setStoredFrecencies((storedFrecencies) => {
            const newFrencencies = { ...storedFrecencies };
            delete newFrencencies[itemKey];
            return newFrencencies;
        });
    }, [keyRef, setStoredFrecencies]);
    const sortedData = (0, react_1.useMemo)(() => {
        if (!data) {
            return [];
        }
        return data.sort((a, b) => {
            const frecencyA = storedFrecencies[keyRef.current(a)];
            const frecencyB = storedFrecencies[keyRef.current(b)];
            // If a has a frecency, but b doesn't, a should come first
            if (frecencyA && !frecencyB) {
                return -1;
            }
            // If b has a frecency, but a doesn't, b should come first
            if (!frecencyA && frecencyB) {
                return 1;
            }
            // If both frecencies are defined,put the one with the higher frecency first
            if (frecencyA && frecencyB) {
                return frecencyB.frecency - frecencyA.frecency;
            }
            // If both frecencies are undefined, keep the original order
            return sortUnvisitedRef.current ? sortUnvisitedRef.current(a, b) : 0;
        });
    }, [storedFrecencies, data, keyRef, sortUnvisitedRef]);
    return { data: sortedData, visitItem, resetRanking };
}
exports.useFrecencySorting = useFrecencySorting;
