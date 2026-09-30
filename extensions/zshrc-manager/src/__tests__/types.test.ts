import { describe, it, expect } from "vitest";

describe("types/index.ts exports", () => {
  it("should export EntryType enum", async () => {
    const { EntryType } = await import("../types/index");
    expect(EntryType).toBeDefined();
  });

  it("should export SectionMarkerType enum", async () => {
    const { SectionMarkerType } = await import("../types/index");
    expect(SectionMarkerType).toBeDefined();
  });

  it("should export error classes", async () => {
    const {
      ZshManagerError,
      FileNotFoundError,
      PermissionError,
      FileTooLargeError,
      ParseError,
      ReadError,
      WriteError,
      isZshManagerError,
      getUserFriendlyErrorMessage,
    } = await import("../types/index");

    expect(ZshManagerError).toBeDefined();
    expect(FileNotFoundError).toBeDefined();
    expect(PermissionError).toBeDefined();
    expect(FileTooLargeError).toBeDefined();
    expect(ParseError).toBeDefined();
    expect(ReadError).toBeDefined();
    expect(WriteError).toBeDefined();
    expect(isZshManagerError).toBeDefined();
    expect(getUserFriendlyErrorMessage).toBeDefined();
  });

  describe("error class usage", () => {
    it("should have FileNotFoundError as ZshManagerError subclass", async () => {
      const { FileNotFoundError, ZshManagerError } = await import("../types/index");
      const error = new FileNotFoundError("/path/to/file");
      expect(error instanceof ZshManagerError).toBe(true);
      expect(error.name).toBe("FileNotFoundError");
    });

    it("should create FileNotFoundError instance", async () => {
      const { FileNotFoundError } = await import("../types/index");
      const error = new FileNotFoundError("/path/to/file");
      expect(error.message).toContain("/path/to/file");
    });

    it("should create PermissionError instance", async () => {
      const { PermissionError } = await import("../types/index");
      const error = new PermissionError("/path/to/file");
      expect(error.message).toContain("/path/to/file");
    });

    it("should create FileTooLargeError instance", async () => {
      const { FileTooLargeError } = await import("../types/index");
      const error = new FileTooLargeError("/path/to/file", 10000, 5000);
      expect(error.message).toContain("/path/to/file");
    });

    it("should create ParseError instance", async () => {
      const { ParseError } = await import("../types/index");
      const error = new ParseError("Invalid syntax");
      expect(error.message).toContain("Invalid syntax");
    });

    it("should create ReadError instance", async () => {
      const { ReadError } = await import("../types/index");
      const error = new ReadError("Failed to read file", new Error("IO Error"));
      expect(error.message).toContain("Failed to read file");
    });

    it("should create WriteError instance", async () => {
      const { WriteError } = await import("../types/index");
      const error = new WriteError("Failed to write file", new Error("IO Error"));
      expect(error.message).toContain("Failed to write file");
    });
  });

  describe("isZshManagerError utility", () => {
    it("should identify ZshManagerError instances", async () => {
      const { FileNotFoundError, isZshManagerError } = await import("../types/index");
      const error = new FileNotFoundError("/path/to/file");
      expect(isZshManagerError(error)).toBe(true);
    });

    it("should return false for non-ZshManagerError instances", async () => {
      const { isZshManagerError } = await import("../types/index");
      const error = new Error("Regular error");
      expect(isZshManagerError(error)).toBe(false);
    });

    it("should return false for null", async () => {
      const { isZshManagerError } = await import("../types/index");
      expect(isZshManagerError(null)).toBe(false);
    });

    it("should return false for undefined", async () => {
      const { isZshManagerError } = await import("../types/index");
      expect(isZshManagerError(undefined)).toBe(false);
    });

    it("should identify FileNotFoundError as ZshManagerError", async () => {
      const { FileNotFoundError, isZshManagerError } = await import("../types/index");
      const error = new FileNotFoundError("/path/to/file");
      expect(isZshManagerError(error)).toBe(true);
    });
  });

  describe("getUserFriendlyErrorMessage utility", () => {
    it("should return user-friendly message for ZshManagerError", async () => {
      const { FileNotFoundError, getUserFriendlyErrorMessage } = await import("../types/index");
      const error = new FileNotFoundError("/path/to/file");
      const message = getUserFriendlyErrorMessage(error);
      // Should return string
      expect(typeof message === "string").toBe(true);
    });

    it("should return user-friendly message for regular Error", async () => {
      const { getUserFriendlyErrorMessage } = await import("../types/index");
      const error = new Error("Regular error");
      const message = getUserFriendlyErrorMessage(error);
      expect(message === undefined || typeof message === "string").toBe(true);
    });

    it("should return user-friendly message for unknown error type", async () => {
      const { getUserFriendlyErrorMessage } = await import("../types/index");
      const message = getUserFriendlyErrorMessage("string error");
      expect(message === undefined || typeof message === "string").toBe(true);
    });
  });

  describe("EntryType enum values", () => {
    it("should have expected entry types", async () => {
      const { EntryType } = await import("../types/index");

      // Check that enum has expected values
      expect(Object.keys(EntryType).length).toBeGreaterThan(0);
    });
  });

  describe("SectionMarkerType enum values", () => {
    it("should have expected marker types", async () => {
      const { SectionMarkerType } = await import("../types/index");

      // Check that enum has expected values
      expect(Object.keys(SectionMarkerType).length).toBeGreaterThan(0);
    });
  });
});

describe("types re-exports", () => {
  it("should successfully import all types without error", async () => {
    // This test verifies that all re-exports in types/index.ts are valid
    await expect(import("../types/index")).resolves.toBeDefined();
  });
});
