/**
 * Predefined Google Cloud IAM roles information
 * This file contains common GCP IAM roles and their descriptions to avoid
 * unnecessary API calls when displaying role information.
 */

export interface IAMRoleInfo {
  title: string;
  description: string;
  service: string;
}

export const predefinedRoles: Record<string, IAMRoleInfo> = {
  // Storage roles
  "roles/storage.admin": {
    title: "Storage Admin",
    description: "Full control of GCS resources.",
    service: "Storage"
  },
  "roles/storage.objectAdmin": {
    title: "Storage Object Admin",
    description: "Grants full control over objects, including listing, creating, viewing, and deleting objects.",
    service: "Storage"
  },
  "roles/storage.objectCreator": {
    title: "Storage Object Creator",
    description: "Allows creating objects but not viewing, deleting or replacing them.",
    service: "Storage"
  },
  "roles/storage.objectViewer": {
    title: "Storage Object Viewer",
    description: "Read access to objects without the ability to modify or delete them.",
    service: "Storage"
  },
  "roles/storage.legacyBucketOwner": {
    title: "Storage Legacy Bucket Owner",
    description: "Grants full control over buckets with object listing/creation/deletion.",
    service: "Storage"
  },
  "roles/storage.legacyBucketReader": {
    title: "Storage Legacy Bucket Reader",
    description: "Grants read access to bucket metadata (not object metadata).",
    service: "Storage"
  },
  "roles/storage.legacyBucketWriter": {
    title: "Storage Legacy Bucket Writer",
    description: "Grants read and write access to bucket metadata (not object metadata).",
    service: "Storage"
  },
  "roles/storage.legacyObjectOwner": {
    title: "Storage Legacy Object Owner",
    description: "Grants full control over objects, including the ability to read and write objects and their metadata.",
    service: "Storage"
  },
  "roles/storage.legacyObjectReader": {
    title: "Storage Legacy Object Reader",
    description: "Grants the ability to read objects and their metadata, excluding ACLs.",
    service: "Storage"
  },
  
  // Compute roles
  "roles/compute.admin": {
    title: "Compute Admin",
    description: "Full control of all Compute Engine resources.",
    service: "Compute Engine"
  },
  "roles/compute.instanceAdmin": {
    title: "Compute Instance Admin",
    description: "Full control of Compute Engine instances, instance groups, disks, snapshots, and images.",
    service: "Compute Engine"
  },
  "roles/compute.networkAdmin": {
    title: "Compute Network Admin",
    description: "Full control of Compute Engine networking resources.",
    service: "Compute Engine"
  },
  "roles/compute.viewer": {
    title: "Compute Viewer",
    description: "Read-only access to get and list Compute Engine resources, without the ability to read data from the resources.",
    service: "Compute Engine"
  },
  
  // IAM roles
  "roles/iam.serviceAccountAdmin": {
    title: "Service Account Admin",
    description: "Create and manage service accounts.",
    service: "IAM"
  },
  "roles/iam.serviceAccountUser": {
    title: "Service Account User",
    description: "Run operations as the service account.",
    service: "IAM"
  },
  "roles/iam.roleAdmin": {
    title: "Role Administrator",
    description: "Ability to create, update, and delete custom roles.",
    service: "IAM"
  },
  
  // Project roles
  "roles/owner": {
    title: "Owner",
    description: "Full access to all resources.",
    service: "Project"
  },
  "roles/editor": {
    title: "Editor",
    description: "Edit access to all resources.",
    service: "Project"
  },
  "roles/viewer": {
    title: "Viewer",
    description: "View access to all resources.",
    service: "Project"
  },
  
  // BigQuery roles
  "roles/bigquery.admin": {
    title: "BigQuery Admin",
    description: "Full access to BigQuery resources and data.",
    service: "BigQuery"
  },
  "roles/bigquery.dataEditor": {
    title: "BigQuery Data Editor",
    description: "Read/write access to data, but not to tables.",
    service: "BigQuery"
  },
  "roles/bigquery.dataViewer": {
    title: "BigQuery Data Viewer",
    description: "Read-only access to data.",
    service: "BigQuery"
  },
  
  // Cloud Run roles
  "roles/run.admin": {
    title: "Cloud Run Admin",
    description: "Full access to Cloud Run resources.",
    service: "Cloud Run"
  },
  "roles/run.invoker": {
    title: "Cloud Run Invoker",
    description: "Ability to invoke Cloud Run services.",
    service: "Cloud Run"
  },
  
  // Kubernetes Engine roles
  "roles/container.admin": {
    title: "Kubernetes Engine Admin",
    description: "Full access to Kubernetes Engine resources.",
    service: "Kubernetes Engine"
  },
  "roles/container.developer": {
    title: "Kubernetes Engine Developer",
    description: "Access to create and manage workloads and services.",
    service: "Kubernetes Engine"
  },
  "roles/container.viewer": {
    title: "Kubernetes Engine Viewer",
    description: "Read-only access to Kubernetes Engine resources.",
    service: "Kubernetes Engine"
  },
  
  // Pub/Sub roles
  "roles/pubsub.admin": {
    title: "Pub/Sub Admin",
    description: "Full access to Pub/Sub resources.",
    service: "Pub/Sub"
  },
  "roles/pubsub.publisher": {
    title: "Pub/Sub Publisher",
    description: "Ability to publish messages to topics.",
    service: "Pub/Sub"
  },
  "roles/pubsub.subscriber": {
    title: "Pub/Sub Subscriber",
    description: "Ability to subscribe to topics and receive messages.",
    service: "Pub/Sub"
  },
  
  // Cloud Functions roles
  "roles/cloudfunctions.admin": {
    title: "Cloud Functions Admin",
    description: "Full access to Cloud Functions resources.",
    service: "Cloud Functions"
  },
  "roles/cloudfunctions.developer": {
    title: "Cloud Functions Developer",
    description: "Ability to create, update, and delete functions.",
    service: "Cloud Functions"
  },
  "roles/cloudfunctions.invoker": {
    title: "Cloud Functions Invoker",
    description: "Ability to invoke Cloud Functions.",
    service: "Cloud Functions"
  },
  
  // Datastore roles
  "roles/datastore.owner": {
    title: "Datastore Owner",
    description: "Full access to Datastore resources.",
    service: "Datastore"
  },
  "roles/datastore.user": {
    title: "Datastore User",
    description: "Ability to create, update, and delete entities.",
    service: "Datastore"
  },
  "roles/datastore.viewer": {
    title: "Datastore Viewer",
    description: "Read-only access to Datastore resources.",
    service: "Datastore"
  },
  
  // Logging roles
  "roles/logging.admin": {
    title: "Logging Admin",
    description: "Full access to logs and logging configurations.",
    service: "Logging"
  },
  "roles/logging.viewer": {
    title: "Logs Viewer",
    description: "Read-only access to logs.",
    service: "Logging"
  },
  
  // Monitoring roles
  "roles/monitoring.admin": {
    title: "Monitoring Admin",
    description: "Full access to monitoring resources.",
    service: "Monitoring"
  },
  "roles/monitoring.viewer": {
    title: "Monitoring Viewer",
    description: "Read-only access to monitoring resources.",
    service: "Monitoring"
  }
};

/**
 * Get information about a predefined IAM role
 * @param roleName The full role name (e.g., "roles/storage.admin")
 * @returns Role information or a default formatted name if not found
 */
export function getRoleInfo(roleName: string): IAMRoleInfo {
  // Check if it's a predefined role
  if (predefinedRoles[roleName]) {
    return predefinedRoles[roleName];
  }
  
  // If not found, format the name nicely
  return {
    title: formatRoleName(roleName),
    description: "",
    service: getRoleService(roleName)
  };
}

/**
 * Format a role name to be more readable
 * @param role The role name (e.g., "roles/storage.legacyObjectOwner")
 * @returns Formatted role name (e.g., "Storage Legacy Object Owner")
 */
export function formatRoleName(role: string): string {
  // Remove the "roles/" prefix if present
  const roleName = role.replace(/^roles\//, "");
  
  // Split by dots and capitalize each part
  return roleName
    .split(".")
    .map(part => 
      part
        .split(/(?=[A-Z])/) // Split on capital letters
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(" - ");
}

/**
 * Extract the service name from a role
 * @param role The role name (e.g., "roles/storage.legacyObjectOwner")
 * @returns Service name (e.g., "Storage")
 */
export function getRoleService(role: string): string {
  const baseName = role.split('/').pop() || role;
  const parts = baseName.split('.');
  
  if (parts.length > 1) {
    const service = parts[0];
    return service.charAt(0).toUpperCase() + service.slice(1);
  }
  
  return "Other";
} 