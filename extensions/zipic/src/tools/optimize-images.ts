import { getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { homedir } from "os";
import { checkZipicInstallation } from "../utils/checkInstall";

type Input = {
  /**
   * Compression level (1-6), lower level means higher quality but larger file size
   * 1: highest quality, 6: lowest quality
   * @default 3
   */
  power?: number;

  /**
   * Output format, options: "original", "jpeg", "webp", "heic", "avif", "png"
   * @default "original"
   */
  format?: string;

  /**
   * Save location, options: "original" or "custom"
   * @default "original"
   */
  saveLocation?: string;

  /**
   * Custom save directory path
   */
  saveDirectory?: string;

  /**
   * Adjust width (0 means auto-adjust)
   * @default 0
   */
  width?: number;

  /**
   * Adjust height (0 means auto-adjust)
   * @default 0
   */
  height?: number;

  /**
   * Whether to add suffix to compressed files
   * @default false
   */
  addSuffix?: boolean;

  /**
   * File suffix, only valid when addSuffix is true
   * @default "-compressed"
   */
  suffix?: string;

  /**
   * Whether to save compressed files in a subfolder
   * @default false
   */
  addSubfolder?: boolean;

  /**
   * Optional array of image paths or URLs. If not provided, will try to get selected images from Finder.
   * Both local file paths and remote URLs (http://, https://) are supported.
   */
  imagePaths?: string[];
};

/**
 * Compress images using Zipic
 * @param input Compression options
 * @returns Compression result
 */
export default async function tool({
  power = 3,
  format = "original",
  saveLocation = "original",
  saveDirectory = "",
  width = 0,
  height = 0,
  addSuffix = false,
  suffix = "-compressed",
  addSubfolder = false,
  imagePaths = [],
}: Input) {
  try {
    // Check if Zipic is installed
    const zipicInstalled = await checkZipicInstallation();
    if (!zipicInstalled) {
      return { success: false, error: "Zipic is not installed" };
    }

    // Function to download a file from URL
    const downloadFile = async (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        try {
          // Create desktop directory if it doesn't exist
          const desktopDir = path.join(homedir(), "Desktop", "Zipic_Downloads");
          if (!fs.existsSync(desktopDir)) {
            fs.mkdirSync(desktopDir, { recursive: true });
          }

          // Extract filename from URL or generate a random one
          let filename = url.split("/").pop() || "";
          if (!filename || filename.indexOf("?") !== -1) {
            filename = filename.split("?")[0] || `image_${Date.now()}.jpg`;
          }

          // Ensure filename has an extension
          if (!path.extname(filename)) {
            filename += ".jpg"; // Default to jpg if no extension
          }

          const localPath = path.join(desktopDir, filename);

          // Create write stream
          const file = fs.createWriteStream(localPath);

          // Choose http or https based on URL
          const requester = url.startsWith("https") ? https : http;

          // Download the file
          requester
            .get(url, (response) => {
              // Check if redirection
              if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                  downloadFile(response.headers.location).then(resolve);
                  return;
                }
              }

              // Check for successful response
              if (response.statusCode !== 200) {
                resolve(null);
                return;
              }

              // Pipe the response to the file
              response.pipe(file);

              // When download completes
              file.on("finish", () => {
                file.close();
                resolve(localPath);
              });
            })
            .on("error", () => {
              // On error, delete the file and resolve null
              fs.unlink(localPath, () => {});
              resolve(null);
            });
        } catch (error) {
          resolve(null);
        }
      });
    };

    // Function to check if a path is a valid image file or non-empty directory
    const isValidPath = (path: string): boolean => {
      // Accept URLs
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return true;
      }

      // Resolve tilde in path if present
      let resolvedPath = path;
      if (path.startsWith("~")) {
        resolvedPath = path.replace(/^~/, homedir());
      }

      // Check if path exists and is a file or directory
      try {
        const stats = fs.statSync(resolvedPath);

        // it's a directory
        if (stats.isDirectory()) {
          return true;
        }

        // If it's a file, check if it's an image
        if (stats.isFile()) {
          const ext = resolvedPath.toLowerCase().split(".").pop() || "";
          const imageExtensions = [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "heic",
            "avif",
            "tiff",
            "bmp",
            "heif",
            "hevc",
            "icns",
          ];
          return imageExtensions.includes(ext);
        }

        return false;
      } catch (e) {
        // Path doesn't exist or can't be accessed
        return false;
      }
    };

    // Get image paths to process
    let filePaths: string[] = [];

    if (imagePaths.length > 0) {
      // Filter out invalid paths
      const validPaths = imagePaths.filter(isValidPath);
      // Process URLs - download them first
      const processedPaths = await Promise.all(
        validPaths.map(async (path) => {
          if (path.startsWith("http://") || path.startsWith("https://")) {
            const localPath = await downloadFile(path);
            return localPath || path; // If download fails, keep original URL
          }
          // Resolve tilde in path if present
          if (path.startsWith("~")) {
            return path.replace(/^~/, homedir());
          }
          return path;
        }),
      );

      filePaths = processedPaths.filter(Boolean) as string[];
    } else {
      // Get selected files from Finder
      const selectedItems = await getSelectedFinderItems();
      const selectedPaths = selectedItems.map((item) => item.path);

      // Filter out invalid paths
      filePaths = selectedPaths.filter(isValidPath);
    }

    if (filePaths.length === 0) {
      return {
        success: true,
        message: "No images selected. Please select images in Finder or provide image paths.",
        imagePaths: [],
        expectedOutputPaths: [],
      };
    }

    // Build URL parameters
    let urlParams = "";

    // Add all file paths as url parameters (skip URLs that couldn't be downloaded)
    filePaths.forEach((path) => {
      // Skip URLs that couldn't be downloaded
      if (!path.startsWith("http://") && !path.startsWith("https://")) {
        // Ensure path is resolved before encoding
        let resolvedPath = path;
        if (path.startsWith("~")) {
          resolvedPath = path.replace(/^~/, homedir());
        }
        urlParams += `url=${encodeURIComponent(resolvedPath)}&`;
      }
    });

    // If no valid local paths, return
    if (!urlParams) {
      return {
        success: false,
        error: "No valid local image paths found. Remote images could not be downloaded.",
      };
    }

    // Convert power to Zipic's level parameter (1-6)
    // Ensure power is within valid range
    const level = Math.max(1, Math.min(6, Math.round(power)));
    urlParams += `level=${level}&`;

    if (format !== "original") {
      urlParams += `format=${format}&`;
    }

    if (saveLocation === "custom") {
      urlParams += `location=custom&`;

      if (saveDirectory) {
        urlParams += `directory=${encodeURIComponent(saveDirectory)}&`;
      }
    }

    if (width > 0) {
      urlParams += `width=${width}&`;
    }

    if (height > 0) {
      urlParams += `height=${height}&`;
    }

    if (addSuffix) {
      urlParams += `addSuffix=true&`;
      urlParams += `suffix=${encodeURIComponent(suffix)}&`;
    }

    if (addSubfolder) {
      urlParams += `addSubfolder=true&`;
    }

    // Remove the last & character
    if (urlParams.endsWith("&")) {
      urlParams = urlParams.slice(0, -1);
    }

    const url = `zipic://compress?${urlParams}`;

    try {
      // Execute compression command
      exec(`open "${url}"`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to compress images",
      };
    }

    // Predict output file paths
    const expectedPaths = filePaths
      .map((filePath) => {
        // Skip prediction for URLs that are not local files
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
          return null;
        }

        // Resolve tilde in path if present
        let resolvedPath = filePath;
        if (filePath.startsWith("~")) {
          resolvedPath = filePath.replace(/^~/, homedir());
        }

        try {
          const stats = fs.statSync(resolvedPath);

          // Handle directories differently
          if (stats.isDirectory()) {
            let outputDir = resolvedPath;

            // If custom save location is specified
            if (saveLocation === "custom" && saveDirectory) {
              // Extract the directory name
              const dirName = path.basename(resolvedPath);
              // Resolve tilde in saveDirectory if present
              let resolvedSaveDir = saveDirectory;
              if (saveDirectory.startsWith("~")) {
                resolvedSaveDir = saveDirectory.replace(/^~/, homedir());
              }
              outputDir = path.join(resolvedSaveDir, dirName);
            }

            // If adding subfolder
            if (addSubfolder) {
              outputDir = path.join(outputDir, "compressed");
            }

            return outputDir;
          } else {
            // Handle files as before
            const dir = path.dirname(resolvedPath);
            const ext = path.extname(resolvedPath);
            const baseName = path.basename(resolvedPath, ext);

            // Determine output directory
            let outputDir = dir;
            if (saveLocation === "custom" && saveDirectory) {
              // Resolve tilde in saveDirectory if present
              let resolvedSaveDir = saveDirectory;
              if (saveDirectory.startsWith("~")) {
                resolvedSaveDir = saveDirectory.replace(/^~/, homedir());
              }
              outputDir = resolvedSaveDir;
            }

            // If adding subfolder
            if (addSubfolder) {
              outputDir = path.join(outputDir, "compressed");
            }

            // Determine filename and extension
            let fileName = baseName;
            const fileExt = format !== "original" ? `.${format}` : ext;

            // If adding suffix
            if (addSuffix) {
              fileName = `${fileName}${suffix}`;
            }

            return path.join(outputDir, `${fileName}${fileExt}`);
          }
        } catch (e) {
          // If there's an error accessing the file/directory
          return null;
        }
      })
      .filter(Boolean); // Remove null values

    // Count how many URLs were in the original paths
    const urlCount = imagePaths.filter((path) => path.startsWith("http://") || path.startsWith("https://")).length;

    // Count how many URLs are still in filePaths (failed to download)
    const failedUrlCount = filePaths.filter((path) => path.startsWith("http://") || path.startsWith("https://")).length;

    // Calculate successfully downloaded URLs
    const downloadedUrlCount = urlCount - failedUrlCount;

    // Create appropriate message
    let message = `Started compressing ${filePaths.length - failedUrlCount} image(s)`;
    if (urlCount > 0) {
      message += `. Downloaded ${downloadedUrlCount} of ${urlCount} remote images to Desktop/Zipic_Downloads`;
    }

    return {
      success: true,
      message,
      imagePaths: filePaths,
      expectedOutputPaths: expectedPaths,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to compress images",
    };
  }
}
