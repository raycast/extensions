import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, Form, Detail, Color, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";

const execPromise = promisify(exec);

interface StorageTransferViewProps {
  projectId: string;
  gcloudPath: string;
}

interface TransferJob {
  name: string;
  description: string;
  status: string;
  creationTime: string;
  lastModificationTime: string;
  schedule?: {
    scheduleStartDate?: {
      day: number;
      month: number;
      year: number;
    };
    scheduleEndDate?: {
      day: number;
      month: number;
      year: number;
    };
    startTimeOfDay?: {
      hours: number;
      minutes: number;
    };
  };
  transferSpec?: {
    gcsDataSource?: {
      bucketName: string;
    };
    gcsDataSink?: {
      bucketName: string;
    };
    objectConditions?: {
      includePrefixes?: string[];
      excludePrefixes?: string[];
    };
    transferOptions?: {
      deleteObjectsFromSourceAfterTransfer?: boolean;
      overwriteObjectsAlreadyExistingInSink?: boolean;
    };
  };
}

export default function StorageTransferView({ projectId, gcloudPath }: StorageTransferViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { push, pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [buckets, setBuckets] = useState<string[]>([]);

  useEffect(() => {
    fetchTransferJobs();
    fetchBuckets();
  }, []);

  async function fetchBuckets() {
    try {
      const command = `storage buckets list --project=${projectId}`;
      const result = await executeGcloudCommand(gcloudPath, command);
      
      if (Array.isArray(result)) {
        const bucketNames = result.map((bucket: any) => bucket.name);
        setBuckets(bucketNames);
      }
    } catch (error: any) {
      console.error("Error fetching buckets:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch buckets",
        message: error.message,
      });
    }
  }

  async function fetchTransferJobs() {
    setIsLoading(true);
    setError(null);
    showToast({
      style: Toast.Style.Animated,
      title: "Loading transfer jobs...",
      message: `Project: ${projectId}`,
    });
    
    try {
      const command = `transfer jobs list --project=${projectId}`;
      const result = await executeGcloudCommand(gcloudPath, command);
      
      let debugText = `Fetched transfer jobs for project: ${projectId}\n`;
      
      if (Array.isArray(result) && result.length > 0) {
        setTransferJobs(result);
        debugText += `Found ${result.length} transfer jobs\n`;
      } else {
        setTransferJobs([]);
        debugText += "No transfer jobs found\n";
      }
      
      setDebugInfo(debugText);
      showToast({
        style: Toast.Style.Success,
        title: "Transfer jobs loaded",
        message: Array.isArray(result) ? `Found ${result.length} jobs` : "No jobs found",
      });
    } catch (error: any) {
      console.error("Error fetching transfer jobs:", error);
      setError(`Failed to fetch transfer jobs: ${error.message}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch transfer jobs",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createTransferJob(values: { 
    sourceBucket: string; 
    destinationBucket: string; 
    description: string;
    includePrefix: string;
    excludePrefix: string;
    deleteAfterTransfer: boolean;
    overwriteExisting: boolean;
  }) {
    setIsCreatingTransfer(true);
    showToast({
      style: Toast.Style.Animated,
      title: "Creating transfer job...",
    });
    
    try {
      // Prepare the command
      let command = `transfer jobs create --source-bucket=${values.sourceBucket} --destination-bucket=${values.destinationBucket} --project=${projectId}`;
      
      if (values.description) {
        command += ` --description="${values.description}"`;
      }
      
      if (values.includePrefix) {
        command += ` --include-prefixes="${values.includePrefix}"`;
      }
      
      if (values.excludePrefix) {
        command += ` --exclude-prefixes="${values.excludePrefix}"`;
      }
      
      if (values.deleteAfterTransfer) {
        command += ` --delete-from-source`;
      }
      
      if (values.overwriteExisting) {
        command += ` --overwrite-when-already-exists`;
      }
      
      // Execute the command
      await executeGcloudCommand(gcloudPath, command);
      
      showToast({
        style: Toast.Style.Success,
        title: "Transfer job created",
        message: "The transfer job has been created successfully",
      });
      
      // Refresh the list
      fetchTransferJobs();
    } catch (error: any) {
      console.error("Error creating transfer job:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create transfer job",
        message: error.message,
      });
    } finally {
      setIsCreatingTransfer(false);
    }
  }

  async function deleteTransferJob(jobName: string) {
    const options: any = {
      title: "Delete Transfer Job",
      message: `Are you sure you want to delete the transfer job "${jobName}"?`,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive,
      },
    };
    
    if (await confirmAlert(options)) {
      showToast({
        style: Toast.Style.Animated,
        title: "Deleting transfer job...",
      });
      
      try {
        const command = `transfer jobs delete ${jobName} --project=${projectId}`;
        await executeGcloudCommand(gcloudPath, command);
        
        showToast({
          style: Toast.Style.Success,
          title: "Transfer job deleted",
          message: "The transfer job has been deleted successfully",
        });
        
        // Refresh the list
        fetchTransferJobs();
      } catch (error: any) {
        console.error("Error deleting transfer job:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete transfer job",
          message: error.message,
        });
      }
    }
  }

  async function runTransferJob(jobName: string) {
    showToast({
      style: Toast.Style.Animated,
      title: "Running transfer job...",
    });
    
    try {
      const command = `transfer jobs run ${jobName} --project=${projectId}`;
      await executeGcloudCommand(gcloudPath, command);
      
      showToast({
        style: Toast.Style.Success,
        title: "Transfer job started",
        message: "The transfer job has been started successfully",
      });
      
      // Refresh the list
      fetchTransferJobs();
    } catch (error: any) {
      console.error("Error running transfer job:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to run transfer job",
        message: error.message,
      });
    }
  }

  function showCreateTransferForm() {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Transfer Job"
              onSubmit={createTransferJob}
            />
          </ActionPanel>
        }
        isLoading={isCreatingTransfer}
      >
        <Form.Dropdown id="sourceBucket" title="Source Bucket" defaultValue="">
          {buckets.map((bucket) => (
            <Form.Dropdown.Item key={bucket} value={bucket} title={bucket} />
          ))}
        </Form.Dropdown>
        
        <Form.Dropdown id="destinationBucket" title="Destination Bucket" defaultValue="">
          {buckets.map((bucket) => (
            <Form.Dropdown.Item key={bucket} value={bucket} title={bucket} />
          ))}
        </Form.Dropdown>
        
        <Form.TextField
          id="description"
          title="Description"
          placeholder="Enter a description for this transfer job"
        />
        
        <Form.TextField
          id="includePrefix"
          title="Include Prefix"
          placeholder="Only include objects with this prefix (optional)"
        />
        
        <Form.TextField
          id="excludePrefix"
          title="Exclude Prefix"
          placeholder="Exclude objects with this prefix (optional)"
        />
        
        <Form.Checkbox
          id="deleteAfterTransfer"
          label="Delete from source after transfer"
          defaultValue={false}
        />
        
        <Form.Checkbox
          id="overwriteExisting"
          label="Overwrite existing objects in destination"
          defaultValue={true}
        />
      </Form>
    );
  }

  function showDebugInfo() {
    push(<Detail markdown={`# Debug Information\n\n${debugInfo}`} />);
  }

  function getStatusIcon(status: string) {
    switch (status.toUpperCase()) {
      case "ENABLED":
        return { source: Icon.Circle, tintColor: Color.Green };
      case "DISABLED":
        return { source: Icon.Circle, tintColor: Color.Red };
      case "PAUSED":
        return { source: Icon.Circle, tintColor: Color.Yellow };
      default:
        return { source: Icon.Circle, tintColor: Color.PrimaryText };
    }
  }

  const filteredJobs = transferJobs.filter((job) => 
    job.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (job.description && job.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchTransferJobs} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transfer jobs..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Create Transfer Job" icon={Icon.Plus} onAction={showCreateTransferForm} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchTransferJobs} />
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
        </ActionPanel>
      }
    >
      {filteredJobs.length > 0 ? (
        filteredJobs.map((job) => (
          <List.Item
            key={job.name}
            title={job.name.split('/').pop() || job.name}
            subtitle={job.description || "No description"}
            accessories={[
              { text: job.status || "Unknown" },
              { text: new Date(job.creationTime).toLocaleDateString() },
            ]}
            icon={getStatusIcon(job.status || "")}
            actions={
              <ActionPanel>
                <Action title="Run Transfer Job" icon={Icon.Play} onAction={() => runTransferJob(job.name)} />
                <Action
                  title="Delete Transfer Job"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteTransferJob(job.name)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchTransferJobs} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No Transfer Jobs Found"
          description="Create a new transfer job to get started"
          icon={{ source: Icon.ArrowClockwise }}
          actions={
            <ActionPanel>
              <Action title="Create Transfer Job" icon={Icon.Plus} onAction={showCreateTransferForm} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchTransferJobs} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
} 