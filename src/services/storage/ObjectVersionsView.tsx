import { ActionPanel, Action, List, showToast, Toast, Icon, confirmAlert, Detail, Color, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";
import { formatFileSize, formatTimestamp, formatGeneration, isCurrentVersion, calculateAge } from "../../utils/FileUtils";

const execPromise = promisify(exec);

interface ObjectVersionsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
  objectName: string;
}

interface ObjectVersion {
  id: string;
  generation: string;
  size: string;
  updated: string;
  timeCreated: string;
  isCurrent: boolean;
  metageneration: string;
  contentType: string;
  storageClass: string;
  etag: string;
  md5Hash?: string;
  crc32c?: string;
  timeDeleted?: string;
}

export default function ObjectVersionsView({ projectId, gcloudPath, bucketName, objectName }: ObjectVersionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<ObjectVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  // Cache for storing results to avoid repeated API calls
  const cache = new Map<string, any>();

  // Function to invalidate cache entries matching a pattern
  function invalidateCache(pattern: RegExp) {
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  }

  // Optimized command execution with caching
  async function executeCommand(gcloudPath: string, command: string, options: { 
    projectId?: string; 
    formatJson?: boolean; 
    quiet?: boolean;
    retries?: number;
  } = {}) {
    const { projectId, formatJson = true, quiet = false, retries = 0 } = options;
    
    // Build the full command
    const projectFlag = projectId ? ` --project=${projectId}` : "";
    const formatFlag = formatJson ? " --format=json" : "";
    const quietFlag = quiet ? " --quiet" : "";
    
    const fullCommand = `${gcloudPath} ${command}${projectFlag}${formatFlag}${quietFlag}`;
    
    // Check cache first
    const cacheKey = fullCommand;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    try {
      console.log(`Executing command: ${fullCommand}`);
      const { stdout, stderr } = await execPromise(fullCommand);
      
      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }
      
      if (!formatJson) {
        return stdout;
      }
      
      if (!stdout || stdout.trim() === "") {
        return [];
      }
      
      const result = JSON.parse(stdout);
      
      // Cache the result
      cache.set(cacheKey, result);
      
      return result;
    } catch (error: any) {
      if (retries > 0) {
        console.log(`Retrying command (${retries} attempts left): ${fullCommand}`);
        return executeCommand(gcloudPath, command, { 
          projectId, 
          formatJson, 
          quiet, 
          retries: retries - 1 
        });
      }
      throw error;
    }
  }

  // Memoized fetch function to avoid recreating it on every render
  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading object versions...",
      message: `Object: ${objectName}`,
    });
    
    try {
      // Use the optimized command execution with caching
      const result = await executeCommand(gcloudPath, `storage objects list gs://${bucketName}/${objectName} --all-versions`, {
        projectId,
        retries: 1
      });
      
      if (!result || (Array.isArray(result) && result.length === 0)) {
        setVersions([]);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No versions found",
          message: `Object "${objectName}" has no versions or versioning is not enabled`,
        });
        setIsLoading(false);
        return;
      }
      
      const formattedVersions = result.map((version: any) => {
        return {
          id: version.id || `${version.name}-${version.generation}`,
          generation: version.generation || "Unknown",
          size: formatFileSize(version.size ? parseInt(version.size) : 0),
          updated: version.updated || version.timeCreated || new Date().toISOString(),
          timeCreated: version.timeCreated || version.updated || new Date().toISOString(),
          isCurrent: isCurrentVersion(version),
          metageneration: version.metageneration || "1",
          contentType: version.contentType || "application/octet-stream",
          storageClass: version.storageClass || "STANDARD",
          etag: version.etag || "Unknown",
          md5Hash: version.md5Hash,
          crc32c: version.crc32c,
          timeDeleted: version.timeDeleted
        };
      });
      
      // Sort versions by generation (newest first)
      formattedVersions.sort((a: ObjectVersion, b: ObjectVersion) => {
        return parseInt(b.generation) - parseInt(a.generation);
      });
      
      setVersions(formattedVersions);
      
      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Versions loaded",
        message: `Found ${formattedVersions.length} versions`,
      });
    } catch (error: any) {
      loadingToast.hide();
      console.error("Error fetching object versions:", error);
      
      // Provide more user-friendly error messages for common errors
      let errorMessage = error.message;
      let errorTitle = "Failed to load versions";
      
      if (error.message.includes("Permission denied") || error.message.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = `You don't have permission to list versions for "${objectName}".`;
      } else if (error.message.includes("not found") || error.message.includes("404")) {
        errorTitle = "Object not found";
        errorMessage = `The object "${objectName}" was not found. It may have been deleted.`;
      } else if (error.message.includes("versioning not enabled")) {
        errorTitle = "Versioning not enabled";
        errorMessage = `Versioning is not enabled for bucket "${bucketName}".`;
      }
      
      setError(`${errorTitle}: ${errorMessage}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName, objectName]);

  // Initial load
  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  async function restoreVersion(generation: string) {
    const options: any = {
      title: "Restore Version",
      message: `Are you sure you want to restore version ${formatGeneration(generation)}?`,
      icon: Icon.ArrowClockwise,
      primaryAction: {
        title: "Restore",
        style: Action.Style.Regular,
      },
    };

    if (await confirmAlert(options)) {
      const restoringToast = await showToast({
        style: Toast.Style.Animated,
        title: "Restoring version...",
        message: `Generation: ${formatGeneration(generation)}`,
      });
      
      try {
        // Use the optimized command execution
        await executeCommand(gcloudPath, `storage objects restore gs://${bucketName}/${objectName}#${generation}`, {
          projectId,
          formatJson: false,
          quiet: true
        });
        
        restoringToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Version restored successfully",
          message: `Object ${objectName} restored to version ${formatGeneration(generation)}`,
        });
        
        // Invalidate the objects cache
        invalidateCache(new RegExp(`gs://${bucketName}`));
        
        // Refresh the versions list
        fetchVersions();
      } catch (error: any) {
        restoringToast.hide();
        console.error("Error restoring version:", error);
        
        // Provide more user-friendly error messages for common errors
        let errorMessage = error.message;
        let errorTitle = "Failed to restore version";
        
        if (error.message.includes("Permission denied") || error.message.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to restore this version.";
        } else if (error.message.includes("not found") || error.message.includes("404")) {
          errorTitle = "Version not found";
          errorMessage = `The version ${formatGeneration(generation)} was not found.`;
        }
        
        showToast({
          style: Toast.Style.Failure,
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  async function deleteVersion(generation: string) {
    const options: any = {
      title: "Delete Version",
      message: `Are you sure you want to delete version ${formatGeneration(generation)}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting version...",
        message: `Generation: ${formatGeneration(generation)}`,
      });
      
      try {
        // Use the optimized command execution
        await executeCommand(gcloudPath, `storage rm gs://${bucketName}/${objectName}#${generation}`, {
          projectId,
          formatJson: false,
          quiet: true
        });
        
        deletingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Version deleted successfully",
          message: `Version ${formatGeneration(generation)} deleted`,
        });
        
        // Invalidate the objects cache
        invalidateCache(new RegExp(`gs://${bucketName}`));
        
        // Refresh the versions list
        fetchVersions();
      } catch (error: any) {
        deletingToast.hide();
        console.error("Error deleting version:", error);
        
        // Provide more user-friendly error messages for common errors
        let errorMessage = error.message;
        let errorTitle = "Failed to delete version";
        
        if (error.message.includes("Permission denied") || error.message.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to delete this version.";
        } else if (error.message.includes("not found") || error.message.includes("404")) {
          errorTitle = "Version not found";
          errorMessage = `The version ${formatGeneration(generation)} was not found.`;
        }
        
        showToast({
          style: Toast.Style.Failure,
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  async function viewVersionDetails(version: ObjectVersion) {
    const detailsMarkdown = `# Version Details\n\n` +
      `**Object:** ${objectName}\n\n` +
      `**Generation:** ${formatGeneration(version.generation)}\n\n` +
      `**Size:** ${version.size}\n\n` +
      `**Content Type:** ${version.contentType}\n\n` +
      `**Created:** ${formatTimestamp(version.timeCreated)}\n\n` +
      `**Updated:** ${formatTimestamp(version.updated)}\n\n` +
      `**Storage Class:** ${version.storageClass}\n\n` +
      `**MD5 Hash:** ${version.md5Hash || "N/A"}\n\n` +
      `**CRC32C:** ${version.crc32c || "N/A"}\n\n` +
      `**ETag:** ${version.etag}\n\n` +
      `**Metageneration:** ${version.metageneration}\n\n` +
      (version.timeDeleted ? `**Deleted:** ${formatTimestamp(version.timeDeleted)}\n\n` : '') +
      `**Status:** ${version.isCurrent ? "Current Version" : "Previous Version"}\n\n`;
    
    push(
      <Detail
        navigationTitle={`Version: ${formatGeneration(version.generation)}`}
        markdown={detailsMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Object" text={objectName} />
            <Detail.Metadata.Label title="Generation" text={formatGeneration(version.generation)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Size" text={version.size} />
            <Detail.Metadata.Label title="Content Type" text={version.contentType} />
            <Detail.Metadata.Label title="Storage Class" text={version.storageClass} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={formatTimestamp(version.timeCreated)} />
            <Detail.Metadata.Label title="Updated" text={formatTimestamp(version.updated)} />
            {version.timeDeleted && (
              <Detail.Metadata.Label title="Deleted" text={formatTimestamp(version.timeDeleted)} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Status" text={version.isCurrent ? "Current Version" : "Previous Version"} />
            <Detail.Metadata.Label title="Age" text={calculateAge(version.timeCreated)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="MD5 Hash" text={version.md5Hash || "N/A"} />
            <Detail.Metadata.Label title="CRC32C" text={version.crc32c || "N/A"} />
            <Detail.Metadata.Label title="ETag" text={version.etag} />
            <Detail.Metadata.Label title="Metageneration" text={version.metageneration} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            {!version.isCurrent && (
              <Action
                title="Restore Version"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => restoreVersion(version.generation)}
              />
            )}
            <Action 
              title="Delete Version" 
              icon={Icon.Trash} 
              style={Action.Style.Destructive} 
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => deleteVersion(version.generation)} 
            />
            <Action 
              title="Back to Versions" 
              icon={Icon.ArrowLeft} 
              shortcut={{ modifiers: ["cmd"], key: "b" }} 
              onAction={() => pop()} 
            />
            <Action 
              title="Refresh" 
              icon={Icon.ArrowClockwise} 
              shortcut={{ modifiers: ["cmd"], key: "r" }} 
              onAction={fetchVersions} 
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView 
          title={error} 
          description="Click to try again"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchVersions} />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search versions..."
      navigationTitle={`Versions of ${objectName}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchVersions}
          />
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      {versions.length === 0 && !isLoading ? (
        <List.EmptyView 
          title="No versions found" 
          description={`Object "${objectName}" has no versions or versioning is not enabled for bucket "${bucketName}".`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchVersions}
              />
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Object Versions" subtitle={`${versions.length} ${versions.length === 1 ? 'version' : 'versions'}`}>
          {versions.map((version) => (
            <List.Item
              key={version.id}
              title={version.isCurrent ? "Current Version" : `Version ${formatGeneration(version.generation)}`}
              subtitle={`Created: ${formatTimestamp(version.timeCreated)}`}
              icon={{ 
                source: version.isCurrent ? Icon.CheckCircle : Icon.Clock, 
                tintColor: version.isCurrent ? Color.Green : Color.Blue 
              }}
              accessories={[
                { text: version.size, tooltip: "Size" },
                { text: calculateAge(version.timeCreated), tooltip: "Age" },
                version.timeDeleted ? { text: "Deleted", icon: Icon.Trash, tooltip: formatTimestamp(version.timeDeleted) } : null
              ].filter(Boolean) as any[]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => viewVersionDetails(version)}
                  />
                  {!version.isCurrent && (
                    <Action
                      title="Restore Version"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => restoreVersion(version.generation)}
                    />
                  )}
                  <Action
                    title="Delete Version"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => deleteVersion(version.generation)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchVersions}
                  />
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
} 