import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, confirmAlert, Form, Detail, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { StorageObjectsView } from "./";
import { executeGcloudCommand } from "../../gcloud";
import BucketLifecycleView from "./BucketLifecycleView";
import BucketIAMView from "./BucketIAMView";
import IAMMembersView from "./IAMMembersView";
import IAMMembersByPrincipalView from "./IAMMembersByPrincipalView";
import StorageStatsView from "./StorageStatsView";

const execPromise = promisify(exec);

interface StorageBucketViewProps {
  projectId: string;
  gcloudPath: string;
}

interface Bucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  created: string;
}

export default function StorageBucketView({ projectId, gcloudPath }: StorageBucketViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { push, pop } = useNavigation();

  useEffect(() => {
    fetchBuckets();
  }, []);

  // Function to generate a unique bucket name with a random suffix
  function generateUniqueBucketName(purpose: string = "storage"): string {
    // Generate a random 6-character alphanumeric string
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${projectId}-${purpose}-${randomSuffix}`.toLowerCase();
  }

  async function fetchBuckets() {
    setIsLoading(true);
    setError(null);
    showToast({
      style: Toast.Style.Animated,
      title: "Loading buckets...",
      message: `Project: ${projectId}`,
    });
    
    try {
      // First, verify the current project
      const { stdout: projectInfo } = await execPromise(`${gcloudPath} config get-value project`);
      const currentProject = projectInfo.trim();
      
      // Check if the project is valid
      if (!currentProject || currentProject === "(unset)" || currentProject === "undefined") {
        setError("No project selected. Please select a project first.");
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "No project selected",
          message: "Please select a project first",
        });
        return;
      }
      
      // Log debug info
      let debugText = `Current project: ${currentProject}\n`;
      
      try {
        // Use the buckets list command instead of storage ls
        const command = `${gcloudPath} storage buckets list --project=${projectId} --format=json`;
        
        console.log(`Executing bucket list command: ${command}`);
        debugText += `Executing command: ${command}\n`;
        
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }
        
        if (!stdout || stdout.trim() === "") {
          setBuckets([]);
          debugText += "No buckets found or empty result\n";
          showToast({
            style: Toast.Style.Success,
            title: "No buckets found",
            message: "Create a bucket to get started",
          });
          setDebugInfo(debugText);
          setIsLoading(false);
          return;
        }
        
        const result = JSON.parse(stdout);
        debugText += `Parsed ${result.length} buckets\n`;
        
        if (Array.isArray(result) && result.length > 0) {
          // Process the bucket data
          const formattedBuckets = result.map((bucket: any) => {
            return {
              id: bucket.id || bucket.name,
              name: bucket.name.replace("gs://", "").replace("/", ""),
              location: bucket.location || "Unknown",
              storageClass: bucket.storageClass || "Standard",
              created: bucket.timeCreated || new Date().toISOString()
            };
          });
          
          setBuckets(formattedBuckets);
          showToast({
            style: Toast.Style.Success,
            title: "Buckets loaded",
            message: `Found ${formattedBuckets.length} buckets`,
          });
        } else {
          setBuckets([]);
          debugText += "No buckets found or empty result\n";
          showToast({
            style: Toast.Style.Success,
            title: "No buckets found",
            message: "Create a bucket to get started",
          });
        }
        
        setDebugInfo(debugText);
      } catch (error: any) {
        // Check for permission errors
        if (error.message && error.message.includes("403")) {
          setError(`Permission denied for project "${projectId}". You may not have the required permissions.`);
          showToast({
            style: Toast.Style.Failure,
            title: "Permission denied",
            message: "You may not have the required permissions for this project",
          });
        } else {
          setError(`Failed to fetch buckets: ${error.message}`);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load buckets",
            message: error.message,
          });
        }
        
        debugText += `Error: ${error.message}\n${error.stack || ""}\n`;
        setDebugInfo(debugText);
      }
    } catch (error: any) {
      console.error("Error fetching buckets:", error);
      setError(`Failed to fetch buckets: ${error.message}`);
      setDebugInfo(`Error: ${error.message}\n${error.stack || ""}\n`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load buckets",
        message: error.message, 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createBucket(values: { name: string; location: string; storageClass: string }) {
    const creatingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating bucket...",
      message: values.name,
    });
    
    try {
      const { name, location, storageClass } = values;
      
      // Use the correct parameter for storage class (--default-storage-class instead of --storage-class)
      const command = `${gcloudPath} storage buckets create gs://${name} --location=${location} --default-storage-class=${storageClass} --project=${projectId}`;
      
      console.log(`Executing bucket create command: ${command}`);
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }
      
      creatingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Bucket created successfully",
        message: name,
      });
      
      // Navigate directly to the bucket's objects view instead of just refreshing the buckets list
      viewBucketObjects(name);
    } catch (error: any) {
      creatingToast.hide();
      console.error("Error creating bucket:", error);
      
      // Provide more user-friendly error messages for common errors
      let errorMessage = error.message;
      let errorTitle = "Failed to create bucket";
      
      if (error.message.includes("bucket name is not available") || error.message.includes("HTTPError 409")) {
        errorTitle = "Bucket name already taken";
        errorMessage = `The bucket name "${values.name}" is already in use. Bucket names must be globally unique across all of Google Cloud. Please try a different name.`;
      } else if (error.message.includes("invalid bucket name")) {
        errorTitle = "Invalid bucket name";
        errorMessage = `"${values.name}" is not a valid bucket name. Bucket names must contain only lowercase letters, numbers, hyphens (-), and periods (.).`;
      } else if (error.message.includes("Permission denied") || error.message.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to create buckets in this project.";
      }
      
      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  async function deleteBucket(bucketName: string) {
    const options: any = {
      title: "Delete Bucket",
      message: `Are you sure you want to delete bucket "${bucketName}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting bucket...",
        message: bucketName,
      });
      
      try {
        // Use the buckets delete command
        const command = `${gcloudPath} storage buckets delete gs://${bucketName} --project=${projectId} --quiet`;
        
        console.log(`Executing bucket delete command: ${command}`);
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }
        
        deletingToast.hide();
        
        // Show a more prominent success message
        await showToast({
          style: Toast.Style.Success,
          title: "Bucket deleted successfully",
          message: bucketName,
        });
        
        // Refresh the bucket list to show the updated state
        fetchBuckets();
      } catch (error: any) {
        deletingToast.hide();
        console.error("Error deleting bucket:", error);
        
        // Provide more user-friendly error messages for common errors
        let errorMessage = error.message;
        let errorTitle = "Failed to delete bucket";
        
        if (error.message.includes("not empty") || error.message.includes("contains objects")) {
          errorTitle = "Bucket not empty";
          errorMessage = `The bucket "${bucketName}" is not empty. Please delete all objects in the bucket first or use the --force flag to delete non-empty buckets.`;
        } else if (error.message.includes("Permission denied") || error.message.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to delete this bucket.";
        } else if (error.message.includes("not found") || error.message.includes("404")) {
          errorTitle = "Bucket not found";
          errorMessage = `The bucket "${bucketName}" was not found. It may have been deleted already.`;
        }
        
        showToast({
          style: Toast.Style.Failure,
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  function viewBucketObjects(bucketName: string) {
    push(<StorageObjectsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function showDebugInfo() {
    push(
      <Detail 
        markdown={`# Debug Information\n\n\`\`\`\n${debugInfo}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={fetchBuckets} />
          </ActionPanel>
        }
      />
    );
  }

  function getStorageClassIcon(storageClass: string) {
    switch (storageClass.toUpperCase()) {
      case 'STANDARD':
        return { source: Icon.HardDrive, tintColor: Color.Green };
      case 'NEARLINE':
        return { source: Icon.Clock, tintColor: Color.Blue };
      case 'COLDLINE':
        return { source: Icon.Snowflake, tintColor: Color.Yellow };
      case 'ARCHIVE':
        return { source: Icon.Box, tintColor: Color.Orange };
      default:
        return { source: Icon.HardDrive, tintColor: Color.PrimaryText };
    }
  }

  function viewBucketIAM(bucketName: string) {
    push(<BucketIAMView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function viewIAMMembers(bucketName: string) {
    push(<IAMMembersView projectId={projectId} gcloudPath={gcloudPath} resourceName={bucketName} resourceType="storage" />);
  }

  function viewIAMMembersByPrincipal(bucketName: string) {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} resourceName={bucketName} resourceType="storage" />);
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView 
          title={error} 
          description="Click for debug information"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Show Debug Info" icon={Icon.Bug} onAction={showDebugInfo} />
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchBuckets} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search buckets..."
      navigationTitle={`Storage Buckets - Project: ${projectId}`}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Create Bucket"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              const suggestedName = generateUniqueBucketName();
              push(
                <Form
                  navigationTitle="Create New Bucket"
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm 
                        title="Create Bucket" 
                        icon={Icon.Plus} 
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onSubmit={createBucket} 
                      />
                      <Action 
                        title="Cancel" 
                        icon={Icon.XmarkCircle} 
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} 
                        onAction={() => pop()} 
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextField
                    id="name"
                    title="Bucket Name"
                    placeholder={`${projectId}-storage`}
                    defaultValue={suggestedName}
                    info={`Must be globally unique across all of Google Cloud. Suggested formats:
• ${projectId}-[purpose]-[env]
• [company]-${projectId}-[purpose]
• [purpose]-${projectId}-[random]`}
                    autoFocus
                  />
                  <Form.Description
                    title="Naming Best Practices"
                    text={`• Use only lowercase letters, numbers, hyphens (-), and periods (.)
• Start and end with a letter or number
• Cannot contain "goog" prefix or close misspellings
• Cannot contain the word "google"
• 3-63 characters in length
• Globally unique across all of Google Cloud

A unique name with random suffix has been generated for you.`}
                  />
                  <Form.Dropdown id="location" title="Location" defaultValue="us-central1" info="Where to store your data">
                    <Form.Dropdown.Item value="us-central1" title="US Central (Iowa)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="us-east1" title="US East (South Carolina)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="us-west1" title="US West (Oregon)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="europe-west1" title="Europe West (Belgium)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="asia-east1" title="Asia East (Taiwan)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="asia-northeast1" title="Asia Northeast (Tokyo)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="asia-south1" title="Asia South (Mumbai)" icon={Icon.Globe} />
                    <Form.Dropdown.Item value="australia-southeast1" title="Australia Southeast (Sydney)" icon={Icon.Globe} />
                  </Form.Dropdown>
                  <Form.Dropdown id="storageClass" title="Storage Class" defaultValue="STANDARD" info="Determines pricing and availability">
                    <Form.Dropdown.Item value="STANDARD" title="Standard" icon={Icon.HardDrive} />
                    <Form.Dropdown.Item value="NEARLINE" title="Nearline" icon={Icon.Clock} />
                    <Form.Dropdown.Item value="COLDLINE" title="Coldline" icon={Icon.Snowflake} />
                    <Form.Dropdown.Item value="ARCHIVE" title="Archive" icon={Icon.Box} />
                  </Form.Dropdown>
                </Form>
              );
            }}
          />
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={fetchBuckets} />
          <Action title="Debug Info" icon={Icon.Bug} onAction={showDebugInfo} />
        </ActionPanel>
      }
    >
      {buckets.length === 0 && !isLoading ? (
        <List.EmptyView 
          title="No buckets found" 
          description="Create a bucket to get started with Google Cloud Storage"
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Create Bucket"
                icon={Icon.Plus}
                onAction={() => {
                  const suggestedName = generateUniqueBucketName();
                  push(
                    <Form
                      navigationTitle="Create New Bucket"
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm 
                            title="Create Bucket" 
                            icon={Icon.Plus} 
                            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                            onSubmit={createBucket} 
                          />
                          <Action 
                            title="Cancel" 
                            icon={Icon.XmarkCircle} 
                            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} 
                            onAction={() => pop()} 
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.TextField
                        id="name"
                        title="Bucket Name"
                        placeholder={`${projectId}-storage`}
                        defaultValue={suggestedName}
                        info={`Must be globally unique across all of Google Cloud. Suggested formats:
• ${projectId}-[purpose]-[env]
• [company]-${projectId}-[purpose]
• [purpose]-${projectId}-[random]`}
                        autoFocus
                      />
                      <Form.Description
                        title="Naming Best Practices"
                        text={`• Use only lowercase letters, numbers, hyphens (-), and periods (.)
• Start and end with a letter or number
• Cannot contain "goog" prefix or close misspellings
• Cannot contain the word "google"
• 3-63 characters in length
• Globally unique across all of Google Cloud

A unique name with random suffix has been generated for you.`}
                      />
                      <Form.Dropdown id="location" title="Location" defaultValue="us-central1" info="Where to store your data">
                        <Form.Dropdown.Item value="us-central1" title="US Central (Iowa)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="us-east1" title="US East (South Carolina)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="us-west1" title="US West (Oregon)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="europe-west1" title="Europe West (Belgium)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="asia-east1" title="Asia East (Taiwan)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="asia-northeast1" title="Asia Northeast (Tokyo)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="asia-south1" title="Asia South (Mumbai)" icon={Icon.Globe} />
                        <Form.Dropdown.Item value="australia-southeast1" title="Australia Southeast (Sydney)" icon={Icon.Globe} />
                      </Form.Dropdown>
                      <Form.Dropdown id="storageClass" title="Storage Class" defaultValue="STANDARD" info="Determines pricing and availability">
                        <Form.Dropdown.Item value="STANDARD" title="Standard" icon={Icon.HardDrive} />
                        <Form.Dropdown.Item value="NEARLINE" title="Nearline" icon={Icon.Clock} />
                        <Form.Dropdown.Item value="COLDLINE" title="Coldline" icon={Icon.Snowflake} />
                        <Form.Dropdown.Item value="ARCHIVE" title="Archive" icon={Icon.Box} />
                      </Form.Dropdown>
                    </Form>
                  );
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Storage Buckets" subtitle={`${buckets.length} buckets`}>
          {buckets.map((bucket) => (
            <List.Item
              key={bucket.id}
              title={bucket.name}
              subtitle={bucket.location}
              icon={getStorageClassIcon(bucket.storageClass)}
              accessories={[
                { text: bucket.storageClass, tooltip: "Storage Class" },
                { text: new Date(bucket.created).toLocaleDateString(), tooltip: "Creation Date" }
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${bucket.name}\n\n**Location:** ${bucket.location}\n\n**Storage Class:** ${bucket.storageClass}\n\n**Created:** ${new Date(bucket.created).toLocaleString()}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Bucket Name" text={bucket.name} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Location" text={bucket.location} />
                      <List.Item.Detail.Metadata.Label title="Storage Class" text={bucket.storageClass} />
                      <List.Item.Detail.Metadata.Label title="Created" text={new Date(bucket.created).toLocaleString()} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label 
                        title="Project" 
                        text={projectId} 
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="View Objects"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => viewBucketObjects(bucket.name)}
                  />
                  <Action
                    title="Manage Lifecycle"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    onAction={() => push(<BucketLifecycleView 
                      projectId={projectId} 
                      gcloudPath={gcloudPath} 
                      bucketName={bucket.name} 
                    />)}
                  />
                  <ActionPanel.Section title="IAM">
                    <Action
                      title="Manage IAM Permissions"
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      onAction={() => viewIAMMembersByPrincipal(bucket.name)}
                    />
                  </ActionPanel.Section>
                  <Action
                    title="View Storage Statistics"
                    icon={Icon.BarChart}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={() => push(<StorageStatsView 
                      projectId={projectId} 
                      gcloudPath={gcloudPath} 
                      bucketName={bucket.name}
                    />)}
                  />
                  <Action
                    title="Delete Bucket"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => deleteBucket(bucket.name)}
                  />
                  <Action
                    title="Create Bucket"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => {
                      const suggestedName = generateUniqueBucketName();
                      push(
                        <Form
                          navigationTitle="Create New Bucket"
                          actions={
                            <ActionPanel>
                              <Action.SubmitForm 
                                title="Create Bucket" 
                                icon={Icon.Plus} 
                                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                                onSubmit={createBucket} 
                              />
                              <Action 
                                title="Cancel" 
                                icon={Icon.XmarkCircle} 
                                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} 
                                onAction={() => pop()} 
                              />
                            </ActionPanel>
                          }
                        >
                          <Form.TextField
                            id="name"
                            title="Bucket Name"
                            placeholder={`${projectId}-storage`}
                            defaultValue={suggestedName}
                            info={`Must be globally unique across all of Google Cloud. Suggested formats:
• ${projectId}-[purpose]-[env]
• [company]-${projectId}-[purpose]
• [purpose]-${projectId}-[random]`}
                            autoFocus
                          />
                          <Form.Description
                            title="Naming Best Practices"
                            text={`• Use only lowercase letters, numbers, hyphens (-), and periods (.)
• Start and end with a letter or number
• Cannot contain "goog" prefix or close misspellings
• Cannot contain the word "google"
• 3-63 characters in length
• Globally unique across all of Google Cloud

A unique name with random suffix has been generated for you.`}
                          />
                          <Form.Dropdown id="location" title="Location" defaultValue="us-central1" info="Where to store your data">
                            <Form.Dropdown.Item value="us-central1" title="US Central (Iowa)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="us-east1" title="US East (South Carolina)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="us-west1" title="US West (Oregon)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="europe-west1" title="Europe West (Belgium)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="asia-east1" title="Asia East (Taiwan)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="asia-northeast1" title="Asia Northeast (Tokyo)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="asia-south1" title="Asia South (Mumbai)" icon={Icon.Globe} />
                            <Form.Dropdown.Item value="australia-southeast1" title="Australia Southeast (Sydney)" icon={Icon.Globe} />
                          </Form.Dropdown>
                          <Form.Dropdown id="storageClass" title="Storage Class" defaultValue="STANDARD" info="Determines pricing and availability">
                            <Form.Dropdown.Item value="STANDARD" title="Standard" icon={Icon.HardDrive} />
                            <Form.Dropdown.Item value="NEARLINE" title="Nearline" icon={Icon.Clock} />
                            <Form.Dropdown.Item value="COLDLINE" title="Coldline" icon={Icon.Snowflake} />
                            <Form.Dropdown.Item value="ARCHIVE" title="Archive" icon={Icon.Box} />
                          </Form.Dropdown>
                        </Form>
                      );
                    }}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
} 