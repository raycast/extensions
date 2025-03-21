# Network Service

This service provides functionality to interact with Google Cloud Network resources. It allows users to:

1. View and manage VPC Networks
2. Create and configure Subnets
3. Manage IP Addresses 
4. Configure Firewall Rules
5. Integrate with the Compute Engine service

## Components

- **NetworkService**: Core service class that handles API interactions
- **NetworkView**: Main navigation view for network resources
- **VPCView**: UI component to view and manage VPC networks
- **SubnetsView**: UI component to view and manage subnets
- **IPAddressView**: UI component to view and manage IP addresses
- **FirewallRulesView**: UI component to view and manage firewall rules

## Data Structures

- `VPC`: Represents a Virtual Private Cloud network
- `Subnet`: Represents a subnet within a VPC
- `IPAddress`: Represents an IP address resource
- `FirewallRule`: Represents a firewall rule

## Features

### VPC Network Management

- List and view details of VPC networks
- Create new VPC networks with auto or custom subnet modes
- Configure network properties like MTU

### Subnet Management

- View subnets across all regions or filter by region
- Create new subnets with IP ranges
- Configure private Google access and flow logs
- Create secondary IP ranges

### IP Address Management

- Reserve static internal and external IP addresses
- View IP usage status and assignments
- Generate IP address suggestions based on available ranges

### Firewall Rule Configuration

- Create and manage ingress/egress rules
- Configure priority, protocols, and ports
- Set source/destination ranges and service account targeting

## Integration with Compute Engine

The Network Service integrates with the Compute Engine service to:

- Provide network and subnet options for VM creation
- Validate subnet and zone compatibility
- Display region-aware subnet selections with warnings for mismatches
- Sort subnet options by region compatibility with selected VM zone

## Caching and Performance

The service implements intelligent caching to reduce API calls:

- Resource-specific cache with customizable TTL
- Cache invalidation after resource modifications
- Forced refresh capabilities for real-time data
- Singleton pattern for better memory management

## Usage

```tsx
import { NetworkView, VPCView, SubnetsView } from '../services/network';

// Main network view
<Action.Push
  title="Network Resources"
  target={<NetworkView projectId={projectId} gcloudPath={gcloudPath} />}
  icon={Icon.Network}
/>

// Direct access to VPC view
<Action.Push
  title="VPC Networks"
  target={<VPCView projectId={projectId} gcloudPath={gcloudPath} />}
  icon={Icon.Globe}
/>
``` 