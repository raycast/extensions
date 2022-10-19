/**
 * Use debounced effect
 * @param effect The EffectCallback
 * @param deps The DependencyList
 * @param delay The delay
 */
import { useEffect } from "react";
import { DependencyList, EffectCallback } from "react";

export const useDebouncedEffect = (effect: EffectCallback, deps: DependencyList | undefined, delay: number) => {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...(deps || []), delay]);
};
