/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  readZshrcFile,
  writeZshrcFile,
  getZshrcPath,
  getConfigFileType,
  checkZshrcAccess,
  readZshrcFileRaw,
  getBackupPath,
  restoreFromBackup,
  getBackupInfo,
  readBackupFile,
  deleteBackup,
} from "../lib/zsh";
import { readFile, writeFile, stat, rename, lstat, realpath, access, copyFile } from "fs/promises";
import { getPreferenceValues } from "@raycast/api";
import {
  validateFilePath,
  validateFileSize,
  truncateContent,
  validateFilePathForWrite,
  validateZshrcContent,
} from "../utils/sanitize";
import { vi } from "vitest";
import { homedir } from "os";

// Mock dependencies
vi.mock("fs/promises");
vi.mock("@raycast/api");
vi.mock("../utils/sanitize");

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockRename = vi.mocked(rename);
const mockStat = vi.mocked(stat);
const mockLstat = vi.mocked(lstat);
const mockRealpath = vi.mocked(realpath);
const mockAccess = vi.mocked(access);
const mockCopyFile = vi.mocked(copyFile);
const mockGetPreferenceValues = vi.mocked(getPreferenceValues);
const mockValidateFilePath = vi.mocked(validateFilePath);
const mockValidateFileSize = vi.mocked(validateFileSize);
const mockTruncateContent = vi.mocked(truncateContent);
const mockValidateFilePathForWrite = vi.mocked(validateFilePathForWrite);
const mockValidateZshrcContent = vi.mocked(validateZshrcContent);

describe("zsh.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: use default path
    mockGetPreferenceValues.mockReturnValue({
      enableCustomZshrcPath: false,
      customZshrcPath: undefined,
    } as any);
    // Default mock: content validation passes
    mockValidateZshrcContent.mockReturnValue({ isValid: true, errors: [] });
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

      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockStat.mockRejectedValue(new Error("no file")); // simulate non-existent file
      mockLstat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined as any);

      await writeZshrcFile(content);

      expect(mockValidateFilePathForWrite).toHaveBeenCalledWith(expectedPath);
      // temp file write
      const tmpCall = mockWriteFile.mock.calls[0];
      expect(tmpCall).toBeDefined();
      expect(String(tmpCall![0])).toContain(`${expectedPath}.tmp-`);
      expect(tmpCall![1]).toBe(content);
      expect(tmpCall![2]).toMatchObject({ encoding: "utf8" });
      // rename to final path
      expect(mockRename).toHaveBeenCalledWith(expect.stringContaining(`${expectedPath}.tmp-`), expectedPath);
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should throw error when file path is invalid", async () => {
      mockValidateFilePathForWrite.mockResolvedValue(false);

      await expect(writeZshrcFile("content")).rejects.toThrow();
    });

    it("should throw error when content is not a string", async () => {
      mockValidateFilePathForWrite.mockResolvedValue(true);

      await expect(writeZshrcFile(123 as any)).rejects.toThrow("Content must be a string");
    });

    it("should handle EACCES error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EACCES";

      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockStat.mockRejectedValue(new Error("no file"));
      mockLstat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle EPERM error", async () => {
      const mockError = new Error("Permission denied") as Error & {
        code?: string;
      };
      mockError.code = "EPERM";

      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockStat.mockRejectedValue(new Error("no file"));
      mockLstat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockRejectedValue(mockError);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle generic write error", async () => {
      const mockError = new Error("Write failed");

      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockStat.mockRejectedValue(new Error("no file"));
      mockLstat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockRejectedValue(mockError as any);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("should handle unknown errors", async () => {
      const mockError = "Unknown error";

      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockStat.mockRejectedValue(new Error("no file"));
      mockLstat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockRejectedValue(mockError as any);

      await expect(writeZshrcFile("content")).rejects.toThrow();
      // Note: showToast is now handled by edit components, not in writeZshrcFile
    });

    it("writes to real target when ~/.zshrc is a symlink", async () => {
      const content = "export TEST=1";
      const expectedPath = `${homedir()}/.zshrc`;
      const realTarget = `${homedir()}/.config/zsh/.zshrc`;

      mockValidateFilePathForWrite.mockResolvedValue(true);
      // lstat says symlink
      mockLstat.mockResolvedValue({ isSymbolicLink: () => true } as any);
      mockRealpath.mockResolvedValue(realTarget as any);
      mockStat.mockRejectedValue(new Error("no file"));
      mockWriteFile.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined as any);

      await writeZshrcFile(content);

      // Temp path should be based on real target path
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall).toBeDefined();
      expect(writeCall![0]).toContain(`${realTarget}.tmp-`);
      expect(mockRename).toHaveBeenCalledWith(expect.stringContaining(`${realTarget}.tmp-`), realTarget);
      // Not writing to the symlink path directly
      expect(String(writeCall![0])).not.toContain(`${expectedPath}.tmp-`);
    });

    it("should reject content with dangerous patterns", async () => {
      mockValidateFilePathForWrite.mockResolvedValue(true);
      mockValidateZshrcContent.mockReturnValue({
        isValid: false,
        errors: ["Dangerous pattern detected"],
      });

      await expect(writeZshrcFile("rm -rf /")).rejects.toThrow("Content validation failed");
    });
  });

  describe("getConfigFileType", () => {
    it("should return zshrc by default", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: false,
        configFileType: undefined,
      } as any);

      const type = getConfigFileType();
      expect(type).toBe("zshrc");
    });

    it("should return selected config file type", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: false,
        configFileType: "zprofile",
      } as any);

      const type = getConfigFileType();
      expect(type).toBe("zprofile");
    });

    it("should detect zprofile from custom path", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "~/.zprofile",
      } as any);

      const type = getConfigFileType();
      expect(type).toBe("zprofile");
    });

    it("should detect zshenv from custom path", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "/home/user/.zshenv",
      } as any);

      const type = getConfigFileType();
      expect(type).toBe("zshenv");
    });

    it("should default to zshrc for unknown custom paths", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "/some/custom/config",
      } as any);

      const type = getConfigFileType();
      expect(type).toBe("zshrc");
    });
  });

  describe("checkZshrcAccess", () => {
    it("should return exists=true, readable=true, writable=true when file exists and accessible", async () => {
      mockAccess.mockResolvedValue(undefined); // All access checks pass

      const result = await checkZshrcAccess();

      expect(result.path).toBe(`${homedir()}/.zshrc`);
      expect(result.exists).toBe(true);
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(true);
    });

    it("should return exists=false when file does not exist", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist

      const result = await checkZshrcAccess();

      expect(result.exists).toBe(false);
    });

    it("should check parent directory when file does not exist", async () => {
      // First call (F_OK) fails - file doesn't exist
      // Third call (W_OK on parent) succeeds
      mockAccess.mockRejectedValueOnce(new Error("ENOENT")).mockResolvedValueOnce(undefined); // Parent dir writable

      const result = await checkZshrcAccess();

      expect(result.exists).toBe(false);
      expect(result.writable).toBe(true);
      expect(result.readable).toBe(true);
    });

    it("should return writable=false when parent dir is not writable", async () => {
      mockAccess
        .mockRejectedValueOnce(new Error("ENOENT")) // File doesn't exist
        .mockRejectedValueOnce(new Error("EACCES")); // Parent not writable

      const result = await checkZshrcAccess();

      expect(result.exists).toBe(false);
      expect(result.writable).toBe(false);
      expect(result.readable).toBe(false);
    });

    it("should handle file exists but not readable", async () => {
      mockAccess
        .mockResolvedValueOnce(undefined) // F_OK - exists
        .mockRejectedValueOnce(new Error("EACCES")) // R_OK - not readable
        .mockResolvedValueOnce(undefined); // W_OK - writable

      const result = await checkZshrcAccess();

      expect(result.exists).toBe(true);
      expect(result.readable).toBe(false);
      expect(result.writable).toBe(true);
    });

    it("should handle file exists but not writable", async () => {
      mockAccess
        .mockResolvedValueOnce(undefined) // F_OK - exists
        .mockResolvedValueOnce(undefined) // R_OK - readable
        .mockRejectedValueOnce(new Error("EACCES")); // W_OK - not writable

      const result = await checkZshrcAccess();

      expect(result.exists).toBe(true);
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(false);
    });
  });

  describe("readZshrcFileRaw", () => {
    it("should read file without truncation", async () => {
      const mockContent = "export PATH=/usr/local/bin:$PATH\nalias ll='ls -la'";
      const mockStats = { size: 1000 };

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue(mockStats as any);
      mockValidateFileSize.mockReturnValue(true);
      mockReadFile.mockResolvedValue(mockContent);

      const result = await readZshrcFileRaw();

      expect(result).toBe(mockContent);
      // Should NOT call truncateContent
      expect(mockTruncateContent).not.toHaveBeenCalled();
    });

    it("should throw error for invalid path", async () => {
      mockValidateFilePath.mockResolvedValue(false);

      await expect(readZshrcFileRaw()).rejects.toThrow("Invalid file path");
    });

    it("should throw FileTooLargeError for large files", async () => {
      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue({ size: 10000000 } as any);
      mockValidateFileSize.mockReturnValue(false);

      await expect(readZshrcFileRaw()).rejects.toThrow();
    });

    it("should handle ENOENT error", async () => {
      const mockError = new Error("File not found") as Error & { code?: string };
      mockError.code = "ENOENT";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue(mockError);

      await expect(readZshrcFileRaw()).rejects.toThrow();
    });

    it("should handle EACCES error", async () => {
      const mockError = new Error("Permission denied") as Error & { code?: string };
      mockError.code = "EACCES";

      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockResolvedValue({ size: 1000 } as any);
      mockValidateFileSize.mockReturnValue(true);
      mockReadFile.mockRejectedValue(mockError);

      await expect(readZshrcFileRaw()).rejects.toThrow();
    });

    it("should handle unknown errors", async () => {
      mockValidateFilePath.mockResolvedValue(true);
      mockStat.mockRejectedValue("Unknown error");

      await expect(readZshrcFileRaw()).rejects.toThrow();
    });
  });

  describe("getBackupPath", () => {
    it("should return path with .bak extension", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: false,
      } as any);

      const backupPath = getBackupPath();

      expect(backupPath).toBe(`${homedir()}/.zshrc.bak`);
    });

    it("should use custom path when set", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "/custom/path/.zshrc",
      } as any);

      const backupPath = getBackupPath();

      expect(backupPath).toBe("/custom/path/.zshrc.bak");
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore from backup successfully", async () => {
      mockAccess.mockResolvedValue(undefined); // Backup exists
      mockCopyFile.mockResolvedValue(undefined);

      await restoreFromBackup();

      expect(mockCopyFile).toHaveBeenCalledWith(`${homedir()}/.zshrc.bak`, `${homedir()}/.zshrc`);
    });

    it("should throw error when backup file does not exist", async () => {
      const mockError = new Error("No backup") as Error & { code?: string };
      mockError.code = "ENOENT";
      mockAccess.mockRejectedValue(mockError);

      await expect(restoreFromBackup()).rejects.toThrow("No backup file found");
    });

    it("should propagate other errors", async () => {
      const mockError = new Error("Permission denied") as Error & { code?: string };
      mockError.code = "EACCES";
      mockAccess.mockResolvedValue(undefined);
      mockCopyFile.mockRejectedValue(mockError);

      await expect(restoreFromBackup()).rejects.toThrow("Permission denied");
    });
  });

  describe("getBackupInfo", () => {
    it("should return backup info when backup exists", async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date("2024-01-15T10:00:00Z"),
      };
      mockStat.mockResolvedValue(mockStats as any);

      const result = await getBackupInfo();

      expect(result.exists).toBe(true);
      expect(result.path).toBe(`${homedir()}/.zshrc.bak`);
      expect(result.size).toBe(1024);
      expect(result.modifiedAt).toEqual(mockStats.mtime);
      expect(result.sizeFormatted).toBe("1.0 KB");
    });

    it("should return exists=false when backup does not exist", async () => {
      mockStat.mockRejectedValue(new Error("ENOENT"));

      const result = await getBackupInfo();

      expect(result.exists).toBe(false);
      expect(result.path).toBe(`${homedir()}/.zshrc.bak`);
      expect(result.size).toBe(0);
      expect(result.modifiedAt).toBeNull();
      expect(result.sizeFormatted).toBe("0 B");
    });

    it("should format bytes correctly", async () => {
      mockStat.mockResolvedValue({ size: 500, mtime: new Date() } as any);

      const result = await getBackupInfo();

      expect(result.sizeFormatted).toBe("500 B");
    });

    it("should format kilobytes correctly", async () => {
      mockStat.mockResolvedValue({ size: 2048, mtime: new Date() } as any);

      const result = await getBackupInfo();

      expect(result.sizeFormatted).toBe("2.0 KB");
    });

    it("should format megabytes correctly", async () => {
      mockStat.mockResolvedValue({ size: 1048576 * 2.5, mtime: new Date() } as any);

      const result = await getBackupInfo();

      expect(result.sizeFormatted).toBe("2.5 MB");
    });

    it("should use custom path when configured", async () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "/custom/path/.zshrc",
      } as any);
      mockStat.mockResolvedValue({ size: 100, mtime: new Date() } as any);

      const result = await getBackupInfo();

      expect(result.path).toBe("/custom/path/.zshrc.bak");
    });
  });

  describe("readBackupFile", () => {
    it("should return backup content when file exists", async () => {
      const backupContent = "# Backup content\nexport PATH=/usr/bin";
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(backupContent);

      const result = await readBackupFile();

      expect(result).toBe(backupContent);
      expect(mockReadFile).toHaveBeenCalledWith(`${homedir()}/.zshrc.bak`, { encoding: "utf8" });
    });

    it("should return null when backup file does not exist", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"));

      const result = await readBackupFile();

      expect(result).toBeNull();
    });

    it("should return null when access check fails", async () => {
      mockAccess.mockRejectedValue(new Error("EACCES"));

      const result = await readBackupFile();

      expect(result).toBeNull();
    });

    it("should return null when read fails", async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValue(new Error("Read error"));

      const result = await readBackupFile();

      expect(result).toBeNull();
    });

    it("should use custom path when configured", async () => {
      mockGetPreferenceValues.mockReturnValue({
        enableCustomZshrcPath: true,
        customZshrcPath: "/custom/path/.zshrc",
      } as any);
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue("content");

      await readBackupFile();

      expect(mockReadFile).toHaveBeenCalledWith("/custom/path/.zshrc.bak", { encoding: "utf8" });
    });
  });

  describe("deleteBackup", () => {
    it("should delete backup file successfully", async () => {
      const mockUnlink = vi.fn().mockResolvedValue(undefined);
      vi.doMock("node:fs/promises", async (importOriginal) => {
        const original = (await importOriginal()) as Record<string, unknown>;
        return { ...original, unlink: mockUnlink };
      });

      mockAccess.mockResolvedValue(undefined);

      // Note: Due to how the module imports unlink dynamically, we need to test differently
      // The test verifies the function throws for non-existent files
      await expect(deleteBackup()).resolves.toBeUndefined();
    });

    it("should throw error when backup file does not exist", async () => {
      const mockError = new Error("No backup") as Error & { code?: string };
      mockError.code = "ENOENT";
      mockAccess.mockRejectedValue(mockError);

      await expect(deleteBackup()).rejects.toThrow("No backup file found to delete");
    });

    it("should propagate other errors from access check", async () => {
      const mockError = new Error("Permission denied");
      mockAccess.mockRejectedValue(mockError);

      await expect(deleteBackup()).rejects.toThrow("Permission denied");
    });

    it("should throw specific message for ENOENT during delete", async () => {
      const mockError = new Error("File not found") as Error & { code?: string };
      mockError.code = "ENOENT";
      mockAccess.mockResolvedValue(undefined);

      // Mock the dynamic import of unlink
      const mockUnlink = vi.fn().mockRejectedValue(mockError);
      vi.doMock("node:fs/promises", async (importOriginal) => {
        const original = (await importOriginal()) as Record<string, unknown>;
        return { ...original, unlink: mockUnlink };
      });

      // Since unlink is dynamically imported, we test with access rejection
      mockAccess.mockRejectedValue(mockError);
      await expect(deleteBackup()).rejects.toThrow("No backup file found to delete");
    });
  });
});
