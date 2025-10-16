import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { zeitraum } from "@zeitraum/client";

export const useLogin = () => {
  const { apiToken, url } = getPreferenceValues();
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validateToken = async () => {
    setError(undefined);
    setLoading(true);
    setLoggedIn(false);

    const client = zeitraum({ baseUrl: url, apiToken });

    try {
      const { data } = await client.me();
      setLoading(false);

      if (!data) {
        setError("Provided token is invalid");
        return false;
      }
      setLoggedIn(true);
      return true;
    } catch (e: unknown) {
      let errorMessage = String(e);
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setLoading(false);
      setError(errorMessage);
    }
    return false;
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    setLoading(true);
    void validateToken();
  }, []);

  return { loggedIn, error, loading };
};
