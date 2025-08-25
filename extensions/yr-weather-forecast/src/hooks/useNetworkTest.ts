import { useState, useEffect, useCallback } from "react";

/**
 * Simple network test hook to debug network connectivity issues
 */
export function useNetworkTest() {
  const [testResults, setTestResults] = useState<{
    httpbin: boolean;
    metApi: boolean;
    nominatim: boolean;
    error: string | undefined;
  }>({ httpbin: false, metApi: false, nominatim: false, error: undefined });

  const runTests = useCallback(async () => {
    const results: { httpbin: boolean; metApi: boolean; nominatim: boolean; error: string | undefined } = {
      httpbin: false,
      metApi: false,
      nominatim: false,
      error: undefined,
    };

    try {
      // Test 1: Simple HTTP request
      console.log("Testing httpbin.org...");
      const httpbinResponse = await fetch("https://httpbin.org/get");
      results.httpbin = httpbinResponse.ok;
      console.log("httpbin test result:", results.httpbin);
    } catch (err) {
      console.error("httpbin test failed:", err);
      results.error = `httpbin failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      // Test 2: MET API request
      console.log("Testing MET API...");
      const metResponse = await fetch(
        "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.9139&lon=10.7522",
      );
      results.metApi = metResponse.ok;
      console.log("MET API test result:", results.metApi);
    } catch (err) {
      console.error("MET API test failed:", err);
      results.error = results.error
        ? `${results.error}; MET API failed: ${err instanceof Error ? err.message : String(err)}`
        : `MET API failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      // Test 3: Nominatim location search API request
      console.log("Testing Nominatim API...");
      const nominatimResponse = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=test&limit=1", {
        headers: {
          "User-Agent": "raycast-yr-extension/1.0 (https://github.com/kyndig/raycast-yr; contact: raycast@kynd.no)",
        },
      });
      results.nominatim = nominatimResponse.ok;
      console.log("Nominatim API test result:", results.nominatim);
    } catch (err) {
      console.error("Nominatim API test failed:", err);
      results.error = results.error
        ? `${results.error}; Nominatim API failed: ${err instanceof Error ? err.message : String(err)}`
        : `Nominatim API failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    setTestResults(results);
  }, []);

  useEffect(() => {
    runTests();
  }, [runTests]);

  return testResults;
}
