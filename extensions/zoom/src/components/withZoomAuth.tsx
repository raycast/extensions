import { Detail } from "@raycast/api";
import { useMemo, useState } from "react";
import { authorize } from "../api/oauth";

let token: string | null = null;

export function withZoomAuth(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      token = await authorize();

      forceRerender(x + 1);
    })();
  }, []);

  if (!token) {
    // Using the <List /> component makes the placeholder buggy
    return <Detail isLoading />;
  }

  return component;
}

export function getOAuthToken(): string {
  if (!token) {
    throw new Error("getOAuthToken must be used when authenticated");
  }

  return token;
}
