/* eslint-disable @typescript-eslint/no-explicit-any */

import { readZshrcFile, writeZshrcFile, ZSHRC_PATH } from "../lib/zsh";
import { readFile, writeFile, stat } from "fs/promises";
import {
  validateFilePath,
  validateFileSize,
  truncateContent,
} from "../utils/sanitize";
import { vi } from "vitest";

// Mock dependencies
vi.mock("fs/promises");
vi.mock("../utils/sanitize");

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockStat = vi.mocked(stat);
const mockValidateFilePath = vi.mocked(validateFilePath);
const mockValidateFileSize = vi.mocked(validateFileSize);
const mockTruncateContent = vi.mocked(truncateContent);

describe("zsh.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ZSHRC_PATH", () => {
    it("should be defined", () => {
      expect(ZSHRC_PATH).toBeDefined();
      expect(typeof ZSHRC_PATH).toBe("string");
    });
  });

  describe("readZshrcFile", () => {
    it("should successfully read zshrc file", async () => {
      const mockContent = "export PATH=/usr/local/bin:$PATH\nalias ll='ls -la'";
      const mockStats = { size: 1000 };

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue(mockStats as any);
      mockValidateFileSize.mockReturnValue(true);
      mockReadFile.mockResolvedValue(mockContent);
      mockTruncateContent.mockReturnValue(mockContent);

      const result = await readZshrcFile();

      expect(result).toBe(mockContent);
      expect(mockValidateFilePath).toHaveBeenCalledWith(ZSHRC_PATH);
      expect(mockStat).toHaveBeenCalledWith(ZSHRC_PATH);
      expect(mockValidateFileSize).toHaveBeenCalledWith(mockStats.size);
      expect(mockReadFile).toHaveBeenCalledWith(ZSHRC_PATH, {
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

      mockValidateFilePath.mockResolvedValue(true);
      mockWriteFile.mockResolvedValue(undefined);

      await writeZshrcFile(content);

      expect(mockValidateFilePath).toHaveBeenCalledWith(ZSHRC_PATH);
      expect(mockWriteFile).toHaveBeenCalledWith(ZSHRC_PATH, content, {
        encoding: "utf8",
      });
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should throw error when file path is invalid", async () => {
      mockValidateFilePath.mockResolvedValue(false);

      await expect(writeZshrcFile("content")).rejects.toThrow(
        "Invalid file path",
      );
    });

    it("should throw error when content is not a string", async () => {
      mockValidateFilePath.mockResolvedValue(true);

      await expect(writeZshrcFile(123 as any)).rejects.toThrow(
        "Content must be a string",
      );
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
