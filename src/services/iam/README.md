# Google Cloud IAM Service

This module provides a high-performance, user-friendly interface for managing Google Cloud Identity and Access Management (IAM).

## Features

- **IAM Dashboard**: Central hub for all IAM-related functionality
- **Members by Principal View**: View and manage IAM members and their roles, grouped by principal type
- **Performance Optimizations**:
  - Policy caching to reduce API calls
  - Efficient data processing
  - Responsive UI with filtering capabilities
- **User Experience Improvements**:
  - Detailed error messages
  - Service-based filtering
  - Principal type filtering
  - Comprehensive role information

## Components

### IAMService

Core service class that provides:
- Cached IAM policy retrieval
- Principal-centric view of IAM permissions
- Member management (add/remove)
- Service account management
- Custom role management

### IAMMembersByPrincipalView

UI component that displays:
- Members grouped by principal type (user, service account, etc.)
- Roles assigned to each member
- Filtering by service and principal type
- Detailed role information

### IAMDashboardView

Main entry point that provides:
- Access to all IAM functionality
- Overview of available features
- Quick access to common tasks

## Usage

```typescript
import { IAMDashboardView } from "./services/iam";

// Use in your component
function viewIAMService() {
  push(<IAMDashboardView projectId={projectId} gcloudPath={gcloudPath} />);
}
```

## Future Enhancements

- Service Account management UI
- Custom Role management UI
- Policy Simulator
- IAM Recommender integration 