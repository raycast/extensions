import { lazy, Suspense, useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import { ActionPanelBuilders } from "../utils/action-panel-builders";
import { ErrorBoundary } from "./error-boundary";
import { GraphErrorFallback } from "./error-fallbacks";
import { TimeseriesEntry } from "../weather-client";
import { SunTimes } from "../sunrise-client";

// Lazy load the graph generation function
const LazyGraphGenerator = lazy(() =>
  import("../graph-utils").then((module) => ({
    default: function LazyGraphRenderer({
      name,
      series,
      hours,
      options,
    }: {
      name: string;
      series: TimeseriesEntry[];
      hours: number;
      options?: {
        sunByDate?: Record<string, SunTimes>;
        title?: string;
        smooth?: boolean;
      };
    }) {
      const result = module.buildGraphMarkdown(name, series, hours, options);
      return <Detail markdown={result.markdown} />;
    },
  })),
);

interface LazyGraphProps {
  name: string;
  series: TimeseriesEntry[];
  hours: number;
  options?: {
    sunByDate?: Record<string, SunTimes>;
    title?: string;
    smooth?: boolean;
  };
  fallback?: string;
}

/**
 * Lazy-loaded graph component that defers D3 library loading
 * until the graph is actually needed
 */
export function LazyGraph({ name, series, hours, options, fallback }: LazyGraphProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to show loading state
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Detail
        markdown={fallback || "Loading graph..."}
        actions={ActionPanelBuilders.createRefreshActions(() => window.location.reload(), "Refresh Graph")}
      />
    );
  }

  return (
    <ErrorBoundary componentName="Lazy Graph" fallback={<GraphErrorFallback componentName="Lazy Graph" />}>
      <Suspense
        fallback={
          <Detail
            markdown={fallback || "Loading graph..."}
            actions={ActionPanelBuilders.createRefreshActions(() => window.location.reload(), "Refresh Graph")}
          />
        }
      >
        <LazyGraphGenerator name={name} series={series} hours={hours} options={options} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Hook to preload the graph component
 * Call this when user hovers over graph-related actions
 */
export function useGraphPreloader() {
  const preloadGraph = () => {
    // Preload the graph component
    import("../graph-utils");
  };

  return { preloadGraph };
}
