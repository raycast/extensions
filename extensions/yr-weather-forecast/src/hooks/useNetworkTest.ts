import { useState, useEffect, useCallback } from "react";
import { DebugLogger } from "../utils/debug-utils";
import { API_HEADERS } from "../utils/api-config";

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
        headers: API_HEADERS,
      },
    ];

    // Run all tests in parallel
    const testPromises = testConfigs.map(async (config) => {
      try {
        DebugLogger.log(`Testing ${config.name}...`);
        const response = await fetch(config.url, { headers: config.headers });
        const success = response.ok;
        DebugLogger.log(`${config.name} test result:`, success);

        return { success, name: config.name, error: undefined };
      } catch (err) {
        const errorMsg = `${config.name} failed: ${err instanceof Error ? err.message : String(err)}`;
        DebugLogger.error(`${config.name} test failed:`, err);
        return { success: false, name: config.name, error: errorMsg };
      }
    });

    // Wait for all tests to complete and collect results
    const testResults = await Promise.all(testPromises);

    // Build final results object from collected results
    const results: { httpbin: boolean; metApi: boolean; nominatim: boolean; error: string | undefined } = {
      httpbin: false,
      metApi: false,
      nominatim: false,
      error: undefined,
    };

    const errors: string[] = [];

    // Process each test result
    for (const result of testResults) {
      if (result.name === "httpbin") results.httpbin = result.success;
      else if (result.name === "metApi") results.metApi = result.success;
      else if (result.name === "nominatim") results.nominatim = result.success;

      if (result.error) {
        errors.push(result.error);
      }
    }

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
