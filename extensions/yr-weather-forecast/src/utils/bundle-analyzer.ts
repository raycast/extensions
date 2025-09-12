/**
 * Bundle analysis utilities for tracking performance improvements
 */

interface BundleMetrics {
  timestamp: number;
  component: string;
  loadTime: number;
  size?: number;
  cacheHit?: boolean;
}

class BundleAnalyzer {
  private metrics: BundleMetrics[] = [];
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing a component load
   */
  startTiming(component: string): void {
    this.startTimes.set(component, performance.now());
  }

  /**
   * End timing and record metrics
   */
  endTiming(component: string, size?: number, cacheHit = false): void {
    const startTime = this.startTimes.get(component);
    if (!startTime) return;

    const loadTime = performance.now() - startTime;
    this.metrics.push({
      timestamp: Date.now(),
      component,
      loadTime,
      size,
      cacheHit,
    });

    this.startTimes.delete(component);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): BundleMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get average load time for a component
   */
  getAverageLoadTime(component: string): number {
    const componentMetrics = this.metrics.filter((m) => m.component === component);
    if (componentMetrics.length === 0) return 0;

    const totalTime = componentMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    return totalTime / componentMetrics.length;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const totalLoads = this.metrics.length;
    if (totalLoads === 0) return 0;

    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    return cacheHits / totalLoads;
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.startTimes.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalLoads: number;
    averageLoadTime: number;
    cacheHitRate: number;
    slowestComponent: string | null;
    fastestComponent: string | null;
  } {
    const totalLoads = this.metrics.length;
    if (totalLoads === 0) {
      return {
        totalLoads: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        slowestComponent: null,
        fastestComponent: null,
      };
    }

    const averageLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / totalLoads;
    const cacheHitRate = this.getCacheHitRate();

    const componentTimes = this.metrics.reduce(
      (acc, m) => {
        if (!acc[m.component]) {
          acc[m.component] = { total: 0, count: 0 };
        }
        acc[m.component].total += m.loadTime;
        acc[m.component].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    const componentAverages = Object.entries(componentTimes).map(([component, data]) => ({
      component,
      average: data.total / data.count,
    }));

    const slowest = componentAverages.reduce((max, curr) => (curr.average > max.average ? curr : max));
    const fastest = componentAverages.reduce((min, curr) => (curr.average < min.average ? curr : min));

    return {
      totalLoads,
      averageLoadTime,
      cacheHitRate,
      slowestComponent: slowest.component,
      fastestComponent: fastest.component,
    };
  }
}

// Global analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

/**
 * Hook for tracking component performance
 */
export function useBundleAnalyzer(component: string) {
  const startTiming = () => bundleAnalyzer.startTiming(component);
  const endTiming = (size?: number, cacheHit = false) => bundleAnalyzer.endTiming(component, size, cacheHit);

  return { startTiming, endTiming };
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary(): void {
  const summary = bundleAnalyzer.getSummary();
  console.log("Bundle Performance Summary:", summary);

  if (summary.slowestComponent) {
    console.log(`Slowest component: ${summary.slowestComponent} (${summary.averageLoadTime.toFixed(2)}ms)`);
  }

  if (summary.cacheHitRate > 0) {
    console.log(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
  }
}
