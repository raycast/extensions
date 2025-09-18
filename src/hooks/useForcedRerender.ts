import { useCallback, useState } from "react";

export function useForcedRerender() {
  const [, setTick] = useState(0);

  const trigger = useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);

  return trigger;
}
