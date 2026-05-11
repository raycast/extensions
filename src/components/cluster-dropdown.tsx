import { List } from "@raycast/api";
import { ClusterConfig } from "../lib/types";

interface ClusterDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  onClusterChange: (clusterName: string) => void;
}

export function ClusterDropdown({
  clusters,
  selectedCluster,
  onClusterChange,
}: ClusterDropdownProps) {
  // Don't show dropdown if only one cluster
  if (clusters.length <= 1) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select Cluster" value={selectedCluster} onChange={onClusterChange}>
      {clusters.map((cluster) => (
        <List.Dropdown.Item key={cluster.name} title={cluster.name} value={cluster.name} />
      ))}
    </List.Dropdown>
  );
}
