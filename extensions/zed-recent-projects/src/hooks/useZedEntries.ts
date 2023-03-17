import { useEffect, useState } from "react";
import { ZedEntries, setZedEntries, getZedEntires } from "../lib/zedEntries";

export function persistEntriesState(v: (prevState: ZedEntries) => ZedEntries) {
  return (s: ZedEntries) => {
    const nextState = v(s);

    setZedEntries(nextState);

    return nextState;
  };
}

export function useZedEntries() {
  const [entries, setEntries] = useState<ZedEntries>({});

  useEffect(() => {
    getZedEntires().then((e) => setEntries(e));
  }, []);

  return {
    entries,

    setEntries: (uris: string[]) =>
      setEntries(
        persistEntriesState((s) =>
          uris.reduce((acc, uri) => {
            return {
              ...acc,
              [uri]: {
                uri,
              },
            };
          }, s)
        )
      ),

    setEntry: (uri: string) =>
      setEntries(
        persistEntriesState((s) => ({
          ...s,
          [uri]: {
            uri,
          },
        }))
      ),

    removeEntry: (uri: string) =>
      setEntries(
        persistEntriesState((s) => {
          const clone = { ...s };
          delete clone[uri];
          return clone;
        })
      ),
  };
}
