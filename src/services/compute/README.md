# Compute Service

This service provides functionality to interact with Google Cloud Compute Engine. It allows users to:

1. View Virtual Machine instances
2. Start and stop VM instances
3. View disk information
4. Filter by zones

## Components

- **ComputeService**: Core service class that handles API interactions
- **ComputeInstancesView**: UI component to view and manage VM instances
- **ComputeDisksView**: UI component to view disk information

## Data Structures

- `ComputeInstance`: Represents a VM instance
- `Disk`: Represents a persistent disk
- `NetworkInterface`: Network configuration for instances
- `AttachedDisk`: Disk attached to an instance

## Future Improvements

- Create new VM instances
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