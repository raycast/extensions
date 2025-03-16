import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

interface CreateBucketFormProps {
  projectId: string;
  gcloudPath: string;
  onBucketCreated: () => void;
  onCancel: () => void;
  generateUniqueBucketName: (purpose?: string) => string;
}

export default function CreateBucketForm({
  projectId,
  gcloudPath,
  onBucketCreated,
  onCancel,
  generateUniqueBucketName,
}: CreateBucketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedName, setSuggestedName] = useState(generateUniqueBucketName("storage"));
  
  // Generate a new suggested name
  function regenerateName() {
    setSuggestedName(generateUniqueBucketName("storage"));
  }
  
  async function handleSubmit(values: { 
    name: string; 
    location: string; 
    storageClass: string;
    publicAccess: boolean;
    uniformAccess: boolean;
  }) {
    if (!values.name) {
      showToast({
        style: Toast.Style.Failure,
        title: "Bucket name is required",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build the command with all options
      let command = `${gcloudPath} storage buckets create gs://${values.name} --project=${projectId} --location=${values.location} --storage-class=${values.storageClass}`;
      
      // Add optional flags
      if (values.publicAccess) {
        command += " --public-access";
      }
      
      if (values.uniformAccess) {
        command += " --uniform-bucket-level-access";
      }
      
      // Execute the command
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }
      
      showToast({
        style: Toast.Style.Success,
        title: "Bucket created successfully",
        message: `Created bucket: ${values.name}`,
      });
      
      onBucketCreated();
    } catch (error) {
      console.error("Error creating bucket:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create bucket",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Bucket" onSubmit={handleSubmit} />
          <Action title="Regenerate Name" onAction={regenerateName} />
          <Action title="Cancel" onAction={onCancel} />
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
      
      <Form.Checkbox
        id="uniformAccess"
        label="Uniform Bucket-Level Access"
        defaultValue={true}
        info="Use IAM permissions instead of ACLs (recommended)"
      />
      
      <Form.Checkbox
        id="publicAccess"
        label="Public Access"
        defaultValue={false}
        info="WARNING: Makes bucket publicly accessible"
      />
    </Form>
  );
} 