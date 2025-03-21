import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, confirmAlert, Form, Detail, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import StorageObjectsView from "./StorageObjectsView";
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
        
        // Parse the JSON response
        const bucketList = JSON.parse(stdout);
        debugText += `Found ${bucketList.length} buckets\n`;
        
        // Map the response to our Bucket interface
        const mappedBuckets = bucketList.map((bucket: any) => ({
              id: bucket.id || bucket.name,
          name: bucket.name.replace('gs://', ''),
          location: bucket.location || 'Unknown',
          storageClass: bucket.storageClass || 'STANDARD',
          created: bucket.timeCreated || new Date().toISOString(),
        }));
        
        setBuckets(mappedBuckets);
          showToast({
            style: Toast.Style.Success,
            title: "Buckets loaded",
          message: `Found ${mappedBuckets.length} buckets`,
        });
      } catch (error: any) {
        console.error("Error listing buckets:", error);
        debugText += `Error: ${error.message}\n`;
        setError(`Failed to list buckets: ${error.message}`);
          showToast({
            style: Toast.Style.Failure,
          title: "Failed to list buckets",
            message: error.message,
          });
        }
        
        setDebugInfo(debugText);
    } catch (error: any) {
      console.error("Error getting project:", error);
      setError(`Failed to get project: ${error.message}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get project",
        message: error.message, 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createBucket(values: { name: string; location: string; storageClass: string }) {
    setIsLoading(true);
    try {
      // Build the command with all options
      const command = `${gcloudPath} storage buckets create gs://${values.name} --project=${projectId} --location=${values.location} --default-storage-class=${values.storageClass}`;
      
      console.log(`Creating bucket with command: ${command}`);
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }
      
      showToast({
        style: Toast.Style.Success,
        title: "Bucket created",
        message: `Created bucket: ${values.name}`,
      });
      
      // Refresh the bucket list
      fetchBuckets();
    } catch (error: any) {
      console.error("Error creating bucket:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create bucket",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteBucket(bucketName: string) {
    const confirmed = await confirmAlert({
      title: "Delete Bucket",
      message: `Are you sure you want to delete the bucket "${bucketName}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
      },
    });
    
    if (confirmed) {
      setIsLoading(true);
      try {
        const command = `${gcloudPath} storage buckets delete gs://${bucketName} --project=${projectId} --quiet`;
        
        console.log(`Deleting bucket with command: ${command}`);
        
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }
        
        showToast({
          style: Toast.Style.Success,
          title: "Bucket deleted",
          message: `Deleted bucket: ${bucketName}`,
        });
        
        // Refresh the bucket list
        fetchBuckets();
      } catch (error: any) {
        console.error("Error deleting bucket:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete bucket",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  function viewBucketObjects(bucketName: string) {
    push(<StorageObjectsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function showDebugInfo() {
    push(<Detail markdown={debugInfo} navigationTitle="Debug Info" />);
  }

  function getStorageClassIcon(storageClass: string) {
    switch (storageClass.toLowerCase()) {
      case 'standard':
        return { source: Icon.HardDrive, tintColor: Color.Blue };
      case 'nearline':
        return { source: Icon.HardDrive, tintColor: Color.Green };
      case 'coldline':
        return { source: Icon.HardDrive, tintColor: Color.Yellow };
      case 'archive':
        return { source: Icon.HardDrive, tintColor: Color.Red };
      default:
        return { source: Icon.HardDrive, tintColor: Color.PrimaryText };
    }
  }

  function viewBucketIAM(bucketName: string) {
    push(<BucketIAMView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function viewIAMMembers(bucketName: string) {
    push(<IAMMembersView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  function viewIAMMembersByPrincipal(bucketName: string) {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
  }
  
  function viewBucketLifecycle(bucketName: string) {
    push(<BucketLifecycleView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }
  
  function viewBucketStats(bucketName: string) {
    push(<StorageStatsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }
  
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }
  
  function showCreateBucketForm() {
    const suggestedName = generateUniqueBucketName();
    
    push(
      <Form
        navigationTitle="Create Storage Bucket"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Bucket"
              onSubmit={(values: any) => {
                createBucket({
                  name: values.name,
                  location: values.location,
                  storageClass: values.storageClass
                });
                pop();
              }}
            />
            <Action
              title="Cancel"
              onAction={pop}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          title="Bucket Name"
          placeholder="my-unique-bucket-name"
          info="Must be globally unique across all of Google Cloud"
          defaultValue={suggestedName}
        />
        
        <Form.Dropdown
          id="location"
          title="Location"
          defaultValue="us-central1"
        >
          <Form.Dropdown.Section title="Multi-Region">
            <Form.Dropdown.Item value="us" title="United States (us)" />
            <Form.Dropdown.Item value="eu" title="European Union (eu)" />
            <Form.Dropdown.Item value="asia" title="Asia (asia)" />
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Regions">
            <Form.Dropdown.Item value="us-central1" title="Iowa (us-central1)" />
            <Form.Dropdown.Item value="us-east1" title="South Carolina (us-east1)" />
            <Form.Dropdown.Item value="us-west1" title="Oregon (us-west1)" />
            <Form.Dropdown.Item value="europe-west1" title="Belgium (europe-west1)" />
            <Form.Dropdown.Item value="asia-east1" title="Taiwan (asia-east1)" />
          </Form.Dropdown.Section>
        </Form.Dropdown>
        
        <Form.Dropdown
          id="storageClass"
          title="Storage Class"
          defaultValue="STANDARD"
          info="Determines pricing and availability"
        >
          <Form.Dropdown.Item value="STANDARD" title="Standard" />
          <Form.Dropdown.Item value="NEARLINE" title="Nearline" />
          <Form.Dropdown.Item value="COLDLINE" title="Coldline" />
          <Form.Dropdown.Item value="ARCHIVE" title="Archive" />
        </Form.Dropdown>
      </Form>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView 
          title="Error Loading Buckets"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
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
      navigationTitle="Storage Buckets"
      actions={
        <ActionPanel>
          <Action title="Create Bucket" icon={Icon.Plus} onAction={showCreateBucketForm} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
        </ActionPanel>
      }
    >
      {buckets.length === 0 && !isLoading ? (
        <List.EmptyView 
          title="No Buckets Found"
          description="Create a bucket to get started"
          icon={{ source: Icon.Box }}
          actions={
            <ActionPanel>
              <Action title="Create Bucket" icon={Icon.Plus} onAction={showCreateBucketForm} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
            </ActionPanel>
          }
        />
      ) : (
        buckets.map((bucket) => (
            <List.Item
              key={bucket.id}
              title={bucket.name}
            subtitle={bucket.location}
              icon={getStorageClassIcon(bucket.storageClass)}
            accessories={[
              { text: bucket.storageClass },
              { text: formatDate(bucket.created), tooltip: "Created on" }
            ]}
              actions={
                <ActionPanel>
                <ActionPanel.Section title="Bucket Actions">
                  <Action
                    title="View Objects"
                    icon={Icon.List}
                    onAction={() => viewBucketObjects(bucket.name)}
                  />
                  <Action
                    title="View IAM Permissions"
                    icon={Icon.Key}
                    onAction={() => viewBucketIAM(bucket.name)}
                  />
                  <Action
                    title="View IAM Members"
                    icon={Icon.Person}
                    onAction={() => viewIAMMembers(bucket.name)}
                  />
                    <Action
                    title="View IAM Members by Principal"
                    icon={Icon.PersonCircle}
                      onAction={() => viewIAMMembersByPrincipal(bucket.name)}
                    />
                  <Action
                    title="View Lifecycle Rules"
                    icon={Icon.Calendar}
                    onAction={() => viewBucketLifecycle(bucket.name)}
                  />
                  <Action
                    title="View Statistics"
                    icon={Icon.BarChart}
                    onAction={() => viewBucketStats(bucket.name)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Management">
                  <Action
                    title="Create Bucket"
                    icon={Icon.Plus}
                    onAction={showCreateBucketForm}
                  />
                  <Action
                    title="Delete Bucket"
                    icon={Icon.Trash}
                    onAction={() => deleteBucket(bucket.name)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchBuckets}
                  />
                </ActionPanel.Section>
                </ActionPanel>
              }
            />
        ))
      )}
    </List>
  );
} 