import { lazy, Suspense } from "react";
import { Detail } from "@raycast/api";
import { ErrorBoundary } from "react-error-boundary";
import { ActionPanelBuilders } from "../utils/action-panel-builders";
import { DetailErrorFallback } from "./ErrorBoundaryFallback";
import type { ForecastViewProps } from "../forecast";

// Lazy load the ForecastView component to defer D3 loading
const LazyForecastComponent = lazy(() => import("../forecast"));

type LazyForecastProps = ForecastViewProps;

/**
 * Lazy-loaded ForecastView that defers D3 library loading
 * until the forecast view is actually opened
 */
export function LazyForecastView(props: LazyForecastProps) {
  const displayName = props.location ? props.location.displayName : props.name;
  const lat = props.location ? props.location.lat : props.lat;
  const lon = props.location ? props.location.lon : props.lon;

  return (
    <Suspense
      fallback={
        <Detail
          markdown={`
# ${displayName || "Unknown Location"}
## Loading forecast...

Please wait while we load the weather forecast and generate the interactive graph...

**Location:** ${lat.toFixed(3)}, ${lon.toFixed(3)}
${props.targetDate ? `**Date:** ${props.targetDate}` : ""}

*This may take a moment as we load the graph generation libraries...*
          `}
          actions={ActionPanelBuilders.createRefreshActions(() => {}, "Refresh Forecast")}
        />
      }
    >
      <ErrorBoundary FallbackComponent={DetailErrorFallback}>
        <LazyForecastComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}
