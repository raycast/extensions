import { useState, useEffect } from "react";
import { Detail, LocalStorage, getSelectedFinderItems } from "@raycast/api";
import { isFFmpegInstalled } from "./utils/ffmpeg";
import { HelloPage } from "./components/HelloPage";
import { NotInstalled } from "./components/NotInstalled";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Check FFmpeg installation status periodically
  useEffect(() => {
    const checkFFmpeg = async () => {
      try {
        const installed = await isFFmpegInstalled();
        setIsInstalled(installed);
      } catch (error) {
        console.error("Error checking FFmpeg:", error);
        setIsInstalled(false);
      }
    };

    // Initial check
    checkFFmpeg();

    // Set up periodic checks
    const interval = setInterval(checkFFmpeg, 1000); // Check every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Load hello page status and selected Finder items
  useEffect(() => {
    async function loadInitialData() {
      try {
        const seen = await LocalStorage.getItem("hasSeenHelloPage");
        setHasSeenHelloPage(seen === "true");

        const finderItems = await getSelectedFinderItems();
        setInitialFinderFiles(finderItems.map((item) => item.path));
      } catch (error) {
        console.error("Error loading initial data:", error);
        // Set defaults or handle error appropriately
        if (hasSeenHelloPage === null) setHasSeenHelloPage(false); // Example: default if LocalStorage fails
        if (initialFinderFiles === undefined) setInitialFinderFiles([]); // Example: default if getSelectedFinderItems fails
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []); // Removed hasSeenHelloPage and initialFinderFiles from dependencies to run once

  if (isLoading) {
    return <Detail markdown="Loading and checking FFmpeg installation..." />; // Updated loading message
  }

  if (!isInstalled) {
    return <NotInstalled onRefresh={() => setIsInstalled(true)} />;
  }

  if (!hasSeenHelloPage) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} />;
  }

  return <ConverterForm initialFiles={initialFinderFiles} />; // Pass initialFiles to ConverterForm
}
