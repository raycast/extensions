import { lazy, Suspense } from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

// Lazy load the graph component to reduce initial bundle size
// This ensures D3 libraries are only loaded when the graph view is actually accessed
const GraphView = lazy(() => import("../graph"));

interface LazyGraphProps {
  name: string;
  lat: number;
  lon: number;
  hours?: number;
  onShowWelcome?: () => void;
}

/**
 * Lazy-loaded graph component wrapper
 * This reduces the initial bundle size by only loading D3 when the graph is actually needed
 *
 * Bundle size benefits:
 * - D3 libraries (~50KB) are only loaded when graph is accessed
 * - Initial bundle size is significantly smaller
 * - Better performance for users who don't use the graph feature
 */
export default function LazyGraphView(props: LazyGraphProps) {
  return (
    <Suspense
      fallback={
        <Detail
          markdown="# Loading Weather Graph\n\nPreparing interactive weather visualization..."
          actions={
            <ActionPanel>
              <Action title="Loading Graph" icon={Icon.Clock} />
            </ActionPanel>
          }
        />
      }
    >
      <GraphView {...props} />
    </Suspense>
  );
}
