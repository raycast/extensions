/* eslint-disable @typescript-eslint/no-explicit-any */

import { readZshrcFile, writeZshrcFile, getZshrcPath } from "../lib/zsh";
import { readFile, writeFile, stat } from "fs/promises";
import { getPreferenceValues } from "@raycast/api";
import { validateFilePath, validateFileSize, truncateContent } from "../utils/sanitize";
import { vi } from "vitest";
import { homedir } from "os";

// Mock dependencies
vi.mock("fs/promises");
vi.mock("@raycast/api");
vi.mock("../utils/sanitize");

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockStat = vi.mocked(stat);
const mockGetPreferenceValues = vi.mocked(getPreferenceValues);
const mockValidateFilePath = vi.mocked(validateFilePath);
const mockValidateFileSize = vi.mocked(validateFileSize);
const mockTruncateContent = vi.mocked(truncateContent);

describe("zsh.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: use default path
    mockGetPreferenceValues.mockReturnValue({
      enableCustomZshrcPath: false,
      customZshrcPath: undefined,
    } as any);
  });

  describe("getZshrcPath", () => {
    it("should return default path when custom path is disabled", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: false,
        customZshrcPath: undefined,
      } as any);

      const path = getZshrcPath();
      expect(path).toBe(`${homedir()}/.zshrc`);
    });

    it("should return custom path when enabled", () => {
      const customPath = "/custom/path/.zshrc";
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: customPath,
      } as any);

      const path = getZshrcPath();
      expect(path).toBe(customPath);
    });

    it("should expand ~ to home directory", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "~/.config/zshrc",
      } as any);

      const path = getZshrcPath();
      expect(path).toBe(`${homedir()}/.config/zshrc`);
    });

    it("should return default path when checkbox is enabled but path is empty", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "",
      } as any);

      const path = getZshrcPath();
      expect(path).toBe(`${homedir()}/.zshrc`);
    });

    it("should return default path when checkbox is enabled but path is undefined", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: undefined,
      } as any);

      const path = getZshrcPath();
      expect(path).toBe(`${homedir()}/.zshrc`);
    });
  });

  describe("readZshrcFile", () => {
    it("should successfully read zshrc file", async () => {
      const mockContent = "export PATH=/usr/local/bin:$PATH\nalias ll='ls -la'";
      const mockStats = { size: 1000 };
      const expectedPath = `${homedir()}/.zshrc`;

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue(mockStats as any);
      mockValidateFileSize.mockReturnValue(true);
      mockReadFile.mockResolvedValue(mockContent);
      mockTruncateContent.mockReturnValue(mockContent);

      const result = await readZshrcFile();

      expect(result).toBe(mockContent);
      expect(mockValidateFilePath).toHaveBeenCalledWith(expectedPath);
      expect(mockStat).toHaveBeenCalledWith(expectedPath);
      expect(mockValidateFileSize).toHaveBeenCalledWith(mockStats.size);
      expect(mockReadFile).toHaveBeenCalledWith(expectedPath, {
        encoding: "utf8",
      });
      expect(mockTruncateContent).toHaveBeenCalledWith(mockContent);
    });

    it("should throw error when file path is invalid", async () => {
      mockValidateFilePath.mockResolvedValue(false);

      await expect(readZshrcFile()).rejects.toThrow();
    });

    it("should throw FileTooLargeError when file is too large", async () => {
      const mockStats = { size: 1000000 };

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue(mockStats as any);
      mockValidateFileSize.mockReturnValue(false);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });

    it("should handle ENOENT error", async () => {
      const mockError = new Error("File not found") as Error & {
        code?: string;
      };
      mockError.code = "ENOENT";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue(mockError);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });

    it("should handle EACCES error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EACCES";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue(mockError);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });

    it("should handle EPERM error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EPERM";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue(mockError);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });

    it("should handle generic read error", async () => {
      const mockError = new Error("Generic read error");

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue({ size: 1000 } as any);
      mockValidateFileSize.mockReturnValue(true);
      mockReadFile.mockRejectedValue(mockError);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });

    it("should handle unknown errors", async () => {
      const mockError = "Unknown error";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue(mockError);

      await expect(readZshrcFile()).rejects.toThrow();
      // Note: showToast is now handled by useZshrcLoader hook, not in readZshrcFile
    });
  });

  describe("writeZshrcFile", () => {
    it("should successfully write to zshrc file", async () => {
      const content = "export PATH=/usr/local/bin:$PATH\nalias ll='ls -la'";
      const expectedPath = `${homedir()}/.zshrc`;

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockResolvedValue(undefined);

      await writeZshrcFile(content);

      expect(mockValidateFilePath).toHaveBeenCalledWith(expectedPath);
      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, content, {
        encoding: "utf8",
      });
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should throw error when file path is invalid", async () => {
      mockValidateFilePath.mockResolvedValue(false);

      await expect(writeZshrcFile("content")).rejects.toThrow("Invalid file path");
    });

    it("should throw error when content is not a string", async () => {
      mockValidateFilePath.mockResolvedValue(true);

      await expect(writeZshrcFile(123 as any)).rejects.toThrow("Content must be a string");
    });

    it("should handle EACCES error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EACCES";

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle EPERM error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EPERM";

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle generic write error", async () => {
      const mockError = new Error("Write failed");

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle unknown errors", async () => {
      const mockError = "Unknown error";

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });
  });
});
