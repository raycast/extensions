import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, Detail, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { executeGcloudCommand } from "../../gcloud";

interface StorageStatsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName?: string; // Optional: if provided, show stats for a specific bucket
}

interface GCSObject {
  name: string;
  size: string;
  storageClass: string;
  updated: string;
  location?: string;
}

interface GCSBucket {
  name: string;
  location: string;
}

interface StorageStats {
  totalSize: number;
  objectCount: number;
  storageClassDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  largestObjects: {
    name: string;
    size: number;
    storageClass: string;
    updated: string;
  }[];
  recentlyModified: {
    name: string;
    size: number;
    updated: string;
  }[];
}

export default function StorageStatsView({ projectId, gcloudPath, bucketName }: StorageStatsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { push } = useNavigation();

  const fetchStorageStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing storage usage...",
      message: bucketName || `Project: ${projectId}`,
    });

    try {
      let debugText = "";

      // Initialize stats object
      const storageStats: StorageStats = {
        totalSize: 0,
        objectCount: 0,
        storageClassDistribution: {},
        regionDistribution: {},
        largestObjects: [],
        recentlyModified: [],
      };

      // If a bucket name is provided, get stats for that bucket only
      if (bucketName) {
        debugText += `Fetching stats for bucket: ${bucketName}\n`;

        // Get objects in the bucket
        const command = `storage objects list gs://${bucketName} --format=json --limit=1000`;
        const objects = await executeGcloudCommand(gcloudPath, command, projectId);

        if (Array.isArray(objects) && objects.length > 0) {
          // Process objects
          storageStats.objectCount = objects.length;

          // Calculate total size and distributions
          (objects as GCSObject[]).forEach((obj) => {
            const size = parseInt(obj.size || "0");
            storageStats.totalSize += size;

            // Storage class distribution
            const storageClass = obj.storageClass || "STANDARD";
            storageStats.storageClassDistribution[storageClass] =
              (storageStats.storageClassDistribution[storageClass] || 0) + 1;

            // Add to largest objects if applicable
            storageStats.largestObjects.push({
              name: obj.name,
              size: size,
              storageClass: storageClass,
              updated: obj.updated || "",
            });

            // Add to recently modified if applicable
            storageStats.recentlyModified.push({
              name: obj.name,
              size: size,
              updated: obj.updated || "",
            });
          });

          // Sort and limit largest objects
          storageStats.largestObjects.sort((a, b) => b.size - a.size);
          storageStats.largestObjects = storageStats.largestObjects.slice(0, 10);

          // Sort and limit recently modified
          storageStats.recentlyModified.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
          storageStats.recentlyModified = storageStats.recentlyModified.slice(0, 10);

          // Get bucket metadata for region
          const bucketCommand = `storage buckets describe gs://${bucketName} --format=json`;
          const bucketInfo = await executeGcloudCommand(gcloudPath, bucketCommand, projectId);

          if (Array.isArray(bucketInfo) && bucketInfo.length > 0) {
            const location = bucketInfo[0].location || "unknown";
            storageStats.regionDistribution[location] = storageStats.objectCount;
          }
        }
      } else {
        // Get stats for all buckets in the project
        debugText += `Fetching stats for all buckets in project: ${projectId}\n`;

        // Get list of buckets
        const bucketsCommand = `storage buckets list --project=${projectId} --format=json`;
        const buckets = await executeGcloudCommand(gcloudPath, bucketsCommand, projectId);

        if (Array.isArray(buckets) && buckets.length > 0) {
          // Process each bucket
          for (const bucket of buckets as GCSBucket[]) {
            const bucketName = bucket.name.replace("gs://", "").replace("/", "");

            // Get objects in the bucket (limited to 100 per bucket for performance)
            const objectsCommand = `storage objects list gs://${bucketName} --format=json --limit=100`;
            const objects = await executeGcloudCommand(gcloudPath, objectsCommand, projectId);

            if (Array.isArray(objects) && objects.length > 0) {
              // Update object count
              storageStats.objectCount += objects.length;

              // Process objects
              (objects as GCSObject[]).forEach((obj) => {
                const size = parseInt(obj.size || "0");
                storageStats.totalSize += size;

                // Storage class distribution
                const storageClass = obj.storageClass || "STANDARD";
                storageStats.storageClassDistribution[storageClass] =
                  (storageStats.storageClassDistribution[storageClass] || 0) + 1;

                // Add to largest objects if applicable
                storageStats.largestObjects.push({
                  name: obj.name,
                  size: size,
                  storageClass: storageClass,
                  updated: obj.updated || "",
                });

                // Add to recently modified if applicable
                storageStats.recentlyModified.push({
                  name: obj.name,
                  size: size,
                  updated: obj.updated || "",
                });
              });

              // Region distribution
              const location = bucket.location || "unknown";
              storageStats.regionDistribution[location] =
                (storageStats.regionDistribution[location] || 0) + objects.length;
            }
          }

          // Sort and limit largest objects
          storageStats.largestObjects.sort((a, b) => b.size - a.size);
          storageStats.largestObjects = storageStats.largestObjects.slice(0, 10);

          // Sort and limit recently modified
          storageStats.recentlyModified.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
          storageStats.recentlyModified = storageStats.recentlyModified.slice(0, 10);
        }
      }

      setStats(storageStats);
      setDebugInfo(debugText);

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Storage analysis complete",
        message: `Found ${storageStats.objectCount} objects`,
      });
    } catch (err: unknown) {
      loadingToast.hide();
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error analyzing storage:", err);
      setError(errorMessage);
      showFailureToast(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName]);

  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function showDebugInfo() {
    push(
      <Detail
        markdown={`# Debug Information\n\n\`\`\`\n${debugInfo}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={fetchStorageStats} />
          </ActionPanel>
        }
      />,
    );
  }

  function getStorageClassColor(storageClass: string): Color {
    switch (storageClass.toUpperCase()) {
      case "STANDARD":
        return Color.Green;
      case "NEARLINE":
        return Color.Blue;
      case "COLDLINE":
        return Color.Yellow;
      case "ARCHIVE":
        return Color.Orange;
      default:
        return Color.PrimaryText;
    }
  }

  function getStorageClassIcon(storageClass: string) {
    switch (storageClass.toUpperCase()) {
      case "STANDARD":
        return { source: Icon.HardDrive, tintColor: Color.Green };
      case "NEARLINE":
        return { source: Icon.Clock, tintColor: Color.Blue };
      case "COLDLINE":
        return { source: Icon.Snowflake, tintColor: Color.Yellow };
      case "ARCHIVE":
        return { source: Icon.Box, tintColor: Color.Orange };
      default:
        return { source: Icon.HardDrive, tintColor: Color.PrimaryText };
    }
  }

  function getRegionIcon(region: string) {
    if (region.startsWith("us-")) {
      return { source: Icon.Globe, tintColor: Color.Blue };
    } else if (region.startsWith("europe-")) {
      return { source: Icon.Globe, tintColor: Color.Green };
    } else if (region.startsWith("asia-")) {
      return { source: Icon.Globe, tintColor: Color.Red };
    } else if (region.startsWith("australia-")) {
      return { source: Icon.Globe, tintColor: Color.Yellow };
    } else {
      return { source: Icon.Globe, tintColor: Color.PrimaryText };
    }
  }

  function generateStorageClassChart(): string {
    if (!stats) return "";

    const total = Object.values(stats.storageClassDistribution).reduce((a, b) => a + b, 0);
    if (total === 0) return "No data available for storage class distribution.";

    let markdown = "## Storage Class Distribution\n\n";

    Object.entries(stats.storageClassDistribution).forEach(([storageClass, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const barLength = Math.max(1, Math.round((count / total) * 20));
      const bar = "█".repeat(barLength);

      markdown += `**${storageClass}**: ${bar} ${percentage}% (${count} objects)\n\n`;
    });

    return markdown;
  }

  function generateRegionChart(): string {
    if (!stats) return "";

    const total = Object.values(stats.regionDistribution).reduce((a, b) => a + b, 0);
    if (total === 0) return "No data available for region distribution.";

    let markdown = "## Region Distribution\n\n";

    Object.entries(stats.regionDistribution).forEach(([region, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const barLength = Math.max(1, Math.round((count / total) * 20));
      const bar = "█".repeat(barLength);

      markdown += `**${region}**: ${bar} ${percentage}% (${count} objects)\n\n`;
    });

    return markdown;
  }

  function generateLargestObjectsList(): string {
    if (!stats || stats.largestObjects.length === 0) return "No data available for largest objects.";

    let markdown = "## Largest Objects\n\n";

    stats.largestObjects.forEach((obj, index) => {
      markdown += `${index + 1}. **${obj.name}**\n   Size: ${formatBytes(obj.size)} | Class: ${obj.storageClass} | Updated: ${new Date(obj.updated).toLocaleString()}\n\n`;
    });

    return markdown;
  }

  function generateRecentlyModifiedList(): string {
    if (!stats || stats.recentlyModified.length === 0) return "No data available for recently modified objects.";

    let markdown = "## Recently Modified Objects\n\n";

    stats.recentlyModified.forEach((obj, index) => {
      markdown += `${index + 1}. **${obj.name}**\n   Size: ${formatBytes(obj.size)} | Updated: ${new Date(obj.updated).toLocaleString()}\n\n`;
    });

    return markdown;
  }

  function generateStorageOverview(): string {
    if (!stats) return "No storage data available.";

    return (
      `# Storage Overview ${bucketName ? `for ${bucketName}` : ""}\n\n` +
      `**Total Objects:** ${stats.objectCount}\n\n` +
      `**Total Size:** ${formatBytes(stats.totalSize)}\n\n` +
      `**Average Object Size:** ${formatBytes(stats.objectCount > 0 ? stats.totalSize / stats.objectCount : 0)}\n\n` +
      `**Storage Classes:** ${Object.keys(stats.storageClassDistribution).length}\n\n` +
      `**Regions:** ${Object.keys(stats.regionDistribution).length}\n\n`
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchStorageStats} />
            <Action title="Show Debug Info" icon={Icon.Bug} onAction={showDebugInfo} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={`Storage Statistics ${bucketName ? `- ${bucketName}` : ""}`}
      searchBarPlaceholder="Search storage statistics..."
      isShowingDetail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchStorageStats}
          />
          <Action title="Debug Info" icon={Icon.Bug} onAction={showDebugInfo} />
        </ActionPanel>
      }
    >
      {stats && (
        <>
          <List.Section title="Overview">
            <List.Item
              title="Storage Summary"
              subtitle={`${stats.objectCount} objects, ${formatBytes(stats.totalSize)}`}
              icon={Icon.Document}
              detail={
                <List.Item.Detail
                  markdown={generateStorageOverview()}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Total Objects" text={stats.objectCount.toString()} />
                      <List.Item.Detail.Metadata.Label title="Total Size" text={formatBytes(stats.totalSize)} />
                      <List.Item.Detail.Metadata.Label
                        title="Average Size"
                        text={formatBytes(stats.objectCount > 0 ? stats.totalSize / stats.objectCount : 0)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Storage Classes"
                        text={Object.keys(stats.storageClassDistribution).length.toString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Regions"
                        text={Object.keys(stats.regionDistribution).length.toString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          </List.Section>

          {Object.keys(stats.storageClassDistribution).length > 0 && (
            <List.Section title="Storage Classes">
              {Object.entries(stats.storageClassDistribution).map(([storageClass, count]) => {
                const percentage = stats.objectCount > 0 ? ((count / stats.objectCount) * 100).toFixed(1) : "0";
                return (
                  <List.Item
                    key={`storage-class-${storageClass}`}
                    title={storageClass}
                    subtitle={`${count} objects (${percentage}%)`}
                    icon={getStorageClassIcon(storageClass)}
                    detail={
                      <List.Item.Detail
                        markdown={generateStorageClassChart()}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Storage Class Distribution" />
                            {Object.entries(stats.storageClassDistribution).map(([sc, cnt]) => (
                              <List.Item.Detail.Metadata.Label
                                key={`meta-sc-${sc}`}
                                title={sc}
                                text={`${cnt} (${stats.objectCount > 0 ? ((cnt / stats.objectCount) * 100).toFixed(1) : "0"}%)`}
                                icon={{ source: Icon.Circle, tintColor: getStorageClassColor(sc) }}
                              />
                            ))}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {Object.keys(stats.regionDistribution).length > 0 && (
            <List.Section title="Regions">
              {Object.entries(stats.regionDistribution).map(([region, count]) => {
                const percentage = stats.objectCount > 0 ? ((count / stats.objectCount) * 100).toFixed(1) : "0";
                return (
                  <List.Item
                    key={`region-${region}`}
                    title={region}
                    subtitle={`${count} objects (${percentage}%)`}
                    icon={getRegionIcon(region)}
                    detail={
                      <List.Item.Detail
                        markdown={generateRegionChart()}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Region Distribution" />
                            {Object.entries(stats.regionDistribution).map(([reg, cnt]) => (
                              <List.Item.Detail.Metadata.Label
                                key={`meta-reg-${reg}`}
                                title={reg}
                                text={`${cnt} (${stats.objectCount > 0 ? ((cnt / stats.objectCount) * 100).toFixed(1) : "0"}%)`}
                              />
                            ))}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {stats.largestObjects.length > 0 && (
            <List.Section title="Largest Objects">
              {stats.largestObjects.map((obj, index) => (
                <List.Item
                  key={`large-${index}`}
                  title={obj.name}
                  subtitle={formatBytes(obj.size)}
                  icon={getStorageClassIcon(obj.storageClass)}
                  accessories={[{ text: obj.storageClass }, { text: new Date(obj.updated).toLocaleDateString() }]}
                  detail={
                    <List.Item.Detail
                      markdown={generateLargestObjectsList()}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Object Details" />
                          <List.Item.Detail.Metadata.Label title="Name" text={obj.name} />
                          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(obj.size)} />
                          <List.Item.Detail.Metadata.Label title="Storage Class" text={obj.storageClass} />
                          <List.Item.Detail.Metadata.Label
                            title="Last Updated"
                            text={new Date(obj.updated).toLocaleString()}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              ))}
            </List.Section>
          )}

          {stats.recentlyModified.length > 0 && (
            <List.Section title="Recently Modified">
              {stats.recentlyModified.map((obj, index) => (
                <List.Item
                  key={`recent-${index}`}
                  title={obj.name}
                  subtitle={new Date(obj.updated).toLocaleString()}
                  icon={Icon.Clock}
                  accessories={[{ text: formatBytes(obj.size) }]}
                  detail={
                    <List.Item.Detail
                      markdown={generateRecentlyModifiedList()}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Recently Modified Objects" />
                          {stats.recentlyModified.map((o, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={`meta-recent-${i}`}
                              title={o.name}
                              text={`${formatBytes(o.size)} | ${new Date(o.updated).toLocaleString()}`}
                            />
                          ))}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
