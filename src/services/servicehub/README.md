# ServiceHub

The ServiceHub service provides a centralized interface for managing Google Cloud service activation. It allows users to:

- View all available Google Cloud services
- Enable and disable services
- View service details and dependencies
- Filter services by category

## Components

- `ServiceHubView`: Main view component for listing and managing services
- `ServiceDetails`: Detailed view of a specific service

## Service Implementation

The `ServiceHubService` class provides methods for:

- Listing available services
- Enabling services
- Disabling services
- Getting service details

## Usage

```typescript
import { ServiceHubView } from './services/servicehub';

// In your main component
<ServiceHubView projectId={projectId} gcloudPath={gcloudPath} />
```

## Data Structures

### GCPService

```typescript
interface GCPService {
  name: string;           // Service name (e.g., "compute.googleapis.com")
  displayName: string;    // Human-readable name (e.g., "Compute Engine API")
  description?: string;   // Service description
  isEnabled: boolean;     // Whether the service is enabled
  state?: string;         // Service state (e.g., "ENABLED", "DISABLED")
  dependsOn?: string[];   // Services this service depends on
  category?: string;      // Service category (e.g., "Compute", "Storage")
}
```

## Categories

Services are organized into the following categories:

- Compute
- Storage
- Database
- Networking
- Security
- Analytics
- AI & ML
- DevOps
- Other

## Implementation Details

- Uses the `gcloud services` command group for operations
- Implements caching to improve performance
- Groups services by category for better organization
- Provides detailed service information 