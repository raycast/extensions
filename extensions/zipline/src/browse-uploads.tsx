import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Clipboard,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ZiplineFile } from "./types/zipline";
import {
  createZiplineClient,
  formatDate,
  getMimeTypeIcon,
  getPageSize,
} from "./utils/preferences";
import { showFailureToast } from "@raycast/utils";

export default function BrowseUploads() {
  const [files, setFiles] = useState<ZiplineFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadFiles = async (pageNum: number = 1, search?: string) => {
    try {
      setLoading(true);
      setError(undefined);

      const ziplineClient = createZiplineClient();
      const pageSize = getPageSize();

      const response = await ziplineClient.getUserFiles({
        search: search || undefined,
        page: pageNum,
        limit: pageSize,
      });

      setFiles(response.page || []);
      setLoading(false);
      setPage(pageNum);
      setTotalPages(response.pages);
      setTotalCount(response.count);
    } catch (error) {
      setLoading(false);
      setError(error instanceof Error ? error.message : "Failed to load files");

      showFailureToast(error, { title: "Failed to load files" });
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    loadFiles(1, text);
  };

  const handleDeleteFile = async (file: ZiplineFile) => {
    const confirmed = await confirmAlert({
      title: "Delete File",
      message: `Are you sure you want to delete "${file.originalName || file.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        const ziplineClient = createZiplineClient();
        await ziplineClient.deleteFile(file.id);
        showToast({
          style: Toast.Style.Success,
          title: "File deleted successfully",
        });
        loadFiles(page, searchText);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete file",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleCopyUrl = async (file: ZiplineFile) => {
    const ziplineClient = createZiplineClient();
    const fullUrl = `${ziplineClient.baseUrl}${file.url}`;
    await Clipboard.copy(fullUrl);
    showToast({
      style: Toast.Style.Success,
      title: "URL copied to clipboard",
    });
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      loadFiles(page + 1, searchText);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      loadFiles(page - 1, searchText);
    }
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search your uploads..."
      navigationTitle={`Uploads (${totalCount} total)`}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Files"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => loadFiles(page, searchText)}
              />
            </ActionPanel>
          }
        />
      ) : files?.length === 0 && !loading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Files Found"
          description={
            searchText
              ? "Try adjusting your search query"
              : "Upload your first file to get started"
          }
        />
      ) : (
        <>
          {files?.map((file) => (
            <List.Item
              key={file.id}
              title={file.originalName || file.name}
              subtitle={formatDate(file.createdAt)}
              icon={{
                source: getMimeTypeIcon(file.type),
              }}
              accessories={[{ text: `${file.views} views` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="File Actions">
                    <Action
                      title="Copy URL"
                      icon={Icon.Link}
                      onAction={() => handleCopyUrl(file)}
                    />
                    <Action
                      title="Open in Browser"
                      icon={Icon.Globe}
                      onAction={() => {
                        const ziplineClient = createZiplineClient();
                        const fullUrl = `${ziplineClient.baseUrl}${file.url}`;
                        open(fullUrl);
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete File"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteFile(file)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigation">
                    {page > 1 && (
                      <Action
                        title="Previous Page"
                        icon={Icon.ArrowLeft}
                        onAction={handlePreviousPage}
                        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      />
                    )}
                    {page < totalPages && (
                      <Action
                        title="Next Page"
                        icon={Icon.ArrowRight}
                        onAction={handleNextPage}
                        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => loadFiles(page, searchText)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
          {totalPages > 1 && (
            <List.Item
              title={`Page ${page} of ${totalPages}`}
              icon={Icon.Dot}
              actions={
                <ActionPanel>
                  {page > 1 && (
                    <Action
                      title="Previous Page"
                      icon={Icon.ArrowLeft}
                      onAction={handlePreviousPage}
                    />
                  )}
                  {page < totalPages && (
                    <Action
                      title="Next Page"
                      icon={Icon.ArrowRight}
                      onAction={handleNextPage}
                    />
                  )}
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
