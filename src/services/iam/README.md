# Google Cloud IAM Service

This module provides a high-performance, user-friendly interface for managing Google Cloud Identity and Access Management (IAM).

## Features

- **IAM View**: Streamlined interface for viewing and managing IAM members and their roles
- **Members by Principal View**: View and manage IAM members and their roles, grouped by principal type
- **Group Management**: Create and manage Google Cloud IAM groups
- **Role Selection**: Intuitive dropdown for selecting IAM roles, organized by service
- **Contextual Actions**: Add roles directly to existing users without re-entering user information
- **Flexible Member Selection**: Choose from existing members or enter new member IDs
- **Performance Optimizations**:
  - Policy caching to reduce API calls
  - Efficient data processing
  - Responsive UI with filtering capabilities
- **User Experience Improvements**:
  - Detailed error messages
  - Principal type filtering
  - Comprehensive role information
  - Service-based role organization
  - Contextual role management
  - Member selection with auto-suggestions

## Components

### IAMService

Core service class that provides:
- Cached IAM policy retrieval
- Principal-centric view of IAM permissions
- Member management (add/remove)
- Group creation and management
- Service account management
- Custom role management

### IAMMembersByPrincipalView

UI component that displays:
- Members grouped by principal type (user, service account, etc.)
- Roles assigned to each member
- Filtering by principal type
- Detailed role information

### IAMView

Main entry point that provides:
- Access to all IAM functionality
- View and manage IAM members and their roles
- Add and remove members with service-organized role selection
- Add roles to existing members without re-entering user information
- Select from existing members or enter new member IDs
- Create and manage groups
- Filter by principal type

## Usage

```typescript
import { IAMView } from "./services/iam";

// Use in your component
function viewIAMService() {
  push(<IAMView projectId={projectId} gcloudPath={gcloudPath} />);
}
```

## Future Enhancements

- Service Account management UI
- Custom Role management UI
- Policy Simulator
- IAM Recommender integration 