import { Dispatch, SetStateAction } from "react";
/**
 * Returns a stateful value, and a function to update it. The value will be kept between command runs.
 *
 * @remark The value needs to be JSON serializable.
 *
 * @param key - The unique identifier of the state. This can be used to share the state across components and/or commands.
 * @param initialState - The initial value of the state if there aren't any in the Cache yet.
 */
export declare function useCachedState<T>(key: string, initialState: T, config?: {
    cacheNamespace?: string;
}): [T, Dispatch<SetStateAction<T>>];
export declare function useCachedState<T = undefined>(key: string): [T | undefined, Dispatch<SetStateAction<T | undefined>>];
//# sourceMappingURL=useCachedState.d.ts.map