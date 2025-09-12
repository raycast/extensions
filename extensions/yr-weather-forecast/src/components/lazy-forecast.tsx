import { lazy, Suspense, useEffect } from "react";
import { Detail } from "@raycast/api";
import { ActionPanelBuilders } from "../utils/action-panel-builders";
import { ErrorBoundary } from "./error-boundary";
import { FavoritesErrorFallback } from "./error-fallbacks";
import { useBundleAnalyzer } from "../utils/bundle-analyzer";

// Lazy load the ForecastView component to defer D3 loading
const LazyForecastComponent = lazy(() => import("../forecast"));

interface LazyForecastProps {
  name: string;
  lat: number;
  lon: number;
  preCachedGraph?: string;
  onShowWelcome?: () => void;
  targetDate?: string;
  onFavoriteChange?: () => void;
  initialMode?: "detailed" | "summary";
}

/**
 * Lazy-loaded ForecastView that defers D3 library loading
 * until the forecast view is actually opened
 */
export function LazyForecastView(props: LazyForecastProps) {
  const { startTiming, endTiming } = useBundleAnalyzer("LazyForecastView");

  useEffect(() => {
    startTiming();
    return () => {
      endTiming();
    };
  }, [startTiming, endTiming]);

  return (
    <ErrorBoundary componentName="Lazy Forecast" fallback={<FavoritesErrorFallback componentName="Lazy Forecast" />}>
      <Suspense
        fallback={
          <Detail
            markdown={`
# ${props.name}
## Loading forecast...

Please wait while we load the weather forecast and generate the interactive graph...

**Location:** ${props.lat.toFixed(3)}, ${props.lon.toFixed(3)}
${props.targetDate ? `**Date:** ${props.targetDate}` : ""}

*This may take a moment as we load the graph generation libraries...*
            `}
            actions={ActionPanelBuilders.createRefreshActions(() => window.location.reload(), "Refresh Forecast")}
          />
        }
      >
        <LazyForecastComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Hook to preload the forecast component
 * Call this when user hovers over forecast-related actions
 */
export function useForecastPreloader() {
  const preloadForecast = () => {
    // Preload the forecast component and its dependencies
    import("../forecast");
    import("../graph-utils");
  };

  return { preloadForecast };
}
