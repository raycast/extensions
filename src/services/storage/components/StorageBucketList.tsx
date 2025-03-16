import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

interface Bucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  created: string;
}

interface StorageBucketListProps {
  buckets: Bucket[];
  isLoading: boolean;
  onViewBucket: (bucket: Bucket) => void;
  onCreateBucket: () => void;
  onRefresh: () => void;
}

export default function StorageBucketList({
  buckets,
  isLoading,
  onViewBucket,
  onCreateBucket,
  onRefresh,
}: StorageBucketListProps) {
  const [searchText, setSearchText] = useState("");
  
  // Filter buckets based on search text
  const filteredBuckets = buckets.filter(bucket => 
    bucket.name.toLowerCase().includes(searchText.toLowerCase()) ||
    bucket.location.toLowerCase().includes(searchText.toLowerCase()) ||
    bucket.storageClass.toLowerCase().includes(searchText.toLowerCase())
  );
  
  // Format the creation date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }
  
  // Get icon for storage class
  function getStorageClassIcon(storageClass: string): { source: Icon; tintColor: string } {
    switch (storageClass.toLowerCase()) {
      case "standard":
        return { source: Icon.HardDrive, tintColor: "#4285F4" }; // Google Blue
      case "nearline":
        return { source: Icon.HardDrive, tintColor: "#34A853" }; // Google Green
      case "coldline":
        return { source: Icon.HardDrive, tintColor: "#FBBC05" }; // Google Yellow
      case "archive":
        return { source: Icon.HardDrive, tintColor: "#EA4335" }; // Google Red
      default:
        return { source: Icon.HardDrive, tintColor: "#4285F4" }; // Default to Google Blue
    }
  }
  
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search buckets..."
      onSearchTextChange={setSearchText}
      navigationTitle="Storage Buckets"
      actions={
        <ActionPanel>
          <Action title="Create Bucket" icon={Icon.Plus} onAction={onCreateBucket} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
        </ActionPanel>
      }
    >
      {filteredBuckets.length === 0 ? (
        <List.EmptyView
          title="No buckets found"
          description={searchText ? "Try a different search term" : "Create a bucket to get started"}
          icon={{ source: Icon.Box }}
          actions={
            <ActionPanel>
              <Action title="Create Bucket" icon={Icon.Plus} onAction={onCreateBucket} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      ) : (
        filteredBuckets.map(bucket => (
          <List.Item
            key={bucket.id}
            title={bucket.name}
            subtitle={bucket.location}
            icon={getStorageClassIcon(bucket.storageClass)}
            accessories={[
              { text: bucket.storageClass },
              { text: formatDate(bucket.created), tooltip: "Created on" }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Bucket"
                  icon={Icon.Eye}
                  onAction={() => onViewBucket(bucket)}
                />
                <Action
                  title="Create Bucket"
                  icon={Icon.Plus}
                  onAction={onCreateBucket}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={onRefresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
} 