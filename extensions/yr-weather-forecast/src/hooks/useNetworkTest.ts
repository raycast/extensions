import { useState, useEffect, useCallback } from "react";
import { DebugLogger } from "../utils/debug-utils";

type NetworkTestConfig = {
  name: string;
  url: string;
  headers?: Record<string, string>;
};

/**
 * Simplified network test hook with DRY principles
 */
export function useNetworkTest() {
  const [testResults, setTestResults] = useState<{
    httpbin: boolean;
    metApi: boolean;
    nominatim: boolean;
    error: string | undefined;
  }>({ httpbin: false, metApi: false, nominatim: false, error: undefined });

  const runTests = useCallback(async () => {
    const testConfigs: NetworkTestConfig[] = [
      {
        name: "httpbin",
        url: "https://httpbin.org/get",
      },
      {
        name: "metApi",
        url: "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.9139&lon=10.7522",
      },
      {
        name: "nominatim",
        url: "https://nominatim.openstreetmap.org/search?format=json&q=test&limit=1",
        headers: {
          "User-Agent": "raycast-yr-extension/1.0 (https://github.com/kyndig/raycast-yr; contact: raycast@kynd.no)",
        },
      },
    ];

    const results: { httpbin: boolean; metApi: boolean; nominatim: boolean; error: string | undefined } = {
      httpbin: false,
      metApi: false,
      nominatim: false,
      error: undefined,
    };

    const errors: string[] = [];

    // Run all tests in parallel
    const testPromises = testConfigs.map(async (config) => {
      try {
        DebugLogger.log(`Testing ${config.name}...`);
        const response = await fetch(config.url, { headers: config.headers });
        const success = response.ok;
        DebugLogger.log(`${config.name} test result:`, success);

        // Update results based on test name
        if (config.name === "httpbin") results.httpbin = success;
        else if (config.name === "metApi") results.metApi = success;
        else if (config.name === "nominatim") results.nominatim = success;

        return { success, name: config.name };
      } catch (err) {
        const errorMsg = `${config.name} failed: ${err instanceof Error ? err.message : String(err)}`;
        DebugLogger.error(`${config.name} test failed:`, err);
        errors.push(errorMsg);
        return { success: false, name: config.name };
      }
    });

    await Promise.all(testPromises);

    // Combine all errors if any tests failed
    if (errors.length > 0) {
      results.error = errors.join("; ");
    }

    setTestResults(results);
  }, []);

  useEffect(() => {
    runTests();
  }, [runTests]);

  return testResults;
}
