# Storage Service

This service provides functionality to interact with Google Cloud Storage. It allows users to:

1. View and manage storage buckets
2. Browse and manage objects within buckets
3. Configure bucket lifecycle rules
4. Manage bucket IAM permissions
5. View storage statistics and metrics

## Components

- **StorageBucketView**: UI component to view and manage buckets
- **StorageObjectsView**: UI component to view and manage objects
- **BucketLifecycleView**: UI component to configure lifecycle rules
- **BucketIAMView**: UI component to manage bucket permissions
- **StorageStatsView**: UI component to view storage statistics
- **ObjectVersionsView**: UI component to view object versions

## Features

### Bucket Management

- List and view details of storage buckets
- Create new buckets with configurable properties
- Delete buckets with progress feedback and confirmation
- View bucket statistics and usage metrics

### Object Management

- Browse objects with folder-like navigation
- Upload, download, and delete objects
- View object metadata and versions
- Manage object permissions

### Lifecycle Rules

- View and create bucket lifecycle rules
- Configure time-based deletion and storage class transitions
- Delete lifecycle rules

### IAM Integration

- Manage bucket permissions for users, groups, and service accounts
- View IAM policies across buckets
- Add and remove IAM members

## Recent Improvements

### Enhanced Bucket Deletion

- Added visual loading feedback during bucket deletion operations
- Improved error handling with specific error messages
- Added proper cleanup of loading toasts in both success and error scenarios
- Ensured bucket list refreshes automatically after operations

### UI Improvements

- Better progress indicators during long-running operations
- More informative success and error messages
- Improved layout and organization of components

## Usage

```tsx
import { StorageBucketView, StorageObjectsView } from '../services/storage';

// View buckets
<Action.Push
  title="Storage Buckets"
  target={<StorageBucketView projectId={projectId} gcloudPath={gcloudPath} />}
  icon={Icon.Folder}
/>

// View objects in a bucket
<Action.Push
  title="View Bucket Contents"
  target={<StorageObjectsView 
    projectId={projectId} 
    gcloudPath={gcloudPath} 
    bucketName={bucketName} 
  />}
  icon={Icon.Document}
/>
``` 