# Compute Service

This service provides functionality to interact with Google Cloud Compute Engine. It allows users to:

1. View Virtual Machine instances
2. Start and stop VM instances
3. Create new VM instances
4. View disk information
5. Filter by zones

## Components

- **ComputeService**: Core service class that handles API interactions
- **ComputeInstancesView**: UI component to view and manage VM instances
- **ComputeDisksView**: UI component to view disk information
- **CreateVMForm**: UI component to create new VM instances

## Data Structures

- `ComputeInstance`: Represents a VM instance
- `Disk`: Represents a persistent disk
- `NetworkInterface`: Network configuration for instances
- `AttachedDisk`: Disk attached to an instance

## Features

### Virtual Machine Creation

The extension now supports creating new VM instances with the following features:

- Machine type selection (standard or custom configurations)
- Boot disk configuration (image project, image family, disk type and size)
- Network configuration with subnet selection from the NetworkService
- Region-aware subnet filtering to prevent configuration errors
- Service account assignment
- Advanced options for preemptible/spot VMs, maintenance policies, etc.

### UI Improvements

- Progress indicators during long-running operations
- Timeout handling for VM creation operations
- Better error messages and validation
- Automatic refresh after operations complete

## Integration with Network Service

The Compute Service now integrates with the Network Service to:

- Fetch and display available VPC networks
- Show subnet options with region information
- Validate region compatibility between zones and subnets
- Warn users about potential region mismatch issues

## Future Improvements

- Delete instances and disks
- Modify instance properties
- Attach/detach disks

## Usage

```tsx
import { ComputeInstancesView, ComputeDisksView } from '../services/compute';

// Use in navigation
<Action.Push
  title="View VM Instances"
  target={<ComputeInstancesView />}
  icon={Icon.Server}
/>

<Action.Push
  title="View Compute Disks"
  target={<ComputeDisksView />}
  icon={Icon.HardDrive}
/>
``` 