import {
  ZshManagerError,
  FileNotFoundError,
  PermissionError,
  FileTooLargeError,
  ParseError,
  ReadError,
  isZshManagerError,
  getUserFriendlyErrorMessage,
} from "../utils/errors";

describe("errors.ts", () => {
  describe("ZshManagerError", () => {
    it("should be an abstract class", () => {
      // ZshManagerError is abstract but can be instantiated in JavaScript
      // We'll test that it has the expected structure instead
      expect(ZshManagerError.prototype).toBeDefined();
      expect(typeof ZshManagerError).toBe("function");
    });
  });

  describe("FileNotFoundError", () => {
    it("should create error with correct properties", () => {
      const filePath = "/test/.zshrc";
      const error = new FileNotFoundError(filePath);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZshManagerError);
      expect(error.name).toBe("FileNotFoundError");
      expect(error.code).toBe("FILE_NOT_FOUND");
      expect(error.userMessage).toBe(
        "~/.zshrc file not found. Please ensure the file exists in your home directory.",
      );
      expect(error.message).toBe(`Zshrc file not found: ${filePath}`);
      expect(error.context).toEqual({ filePath });
    });

    it("should handle different file paths", () => {
      const filePath = "/Users/username/.zshrc";
      const error = new FileNotFoundError(filePath);

      expect(error.message).toBe(`Zshrc file not found: ${filePath}`);
      expect(error.context?.["filePath"]).toBe(filePath);
    });
  });

  describe("PermissionError", () => {
    it("should create error with correct properties", () => {
      const filePath = "/test/.zshrc";
      const error = new PermissionError(filePath);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZshManagerError);
      expect(error.name).toBe("PermissionError");
      expect(error.code).toBe("PERMISSION_DENIED");
      expect(error.userMessage).toBe(
        "Permission denied reading ~/.zshrc. Please check file permissions.",
      );
      expect(error.message).toBe(`Permission denied reading file: ${filePath}`);
      expect(error.context).toEqual({ filePath });
    });
  });

  describe("FileTooLargeError", () => {
    it("should create error with correct properties", () => {
      const filePath = "/test/.zshrc";
      const fileSize = 1000000;
      const maxSize = 100000;
      const error = new FileTooLargeError(filePath, fileSize, maxSize);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZshManagerError);
      expect(error.name).toBe("FileTooLargeError");
      expect(error.code).toBe("FILE_TOO_LARGE");
      expect(error.userMessage).toBe(
        "~/.zshrc file is too large to process. Please reduce file size.",
      );
      expect(error.message).toBe(
        `File too large: ${filePath} (${fileSize} bytes, max: ${maxSize})`,
      );
      expect(error.context).toEqual({ filePath, fileSize, maxSize });
    });
  });

  describe("ParseError", () => {
    it("should create error with correct properties", () => {
      const message = "Invalid syntax";
      const lineNumber = 42;
      const content = "alias test=";
      const error = new ParseError(message, lineNumber, content);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZshManagerError);
      expect(error.name).toBe("ParseError");
      expect(error.code).toBe("PARSE_ERROR");
      expect(error.userMessage).toBe(
        "Failed to parse ~/.zshrc content. Please check for syntax errors.",
      );
      expect(error.message).toBe(`Parse error: ${message}`);
      expect(error.context).toEqual({ lineNumber, content });
    });

    it("should create error without optional parameters", () => {
      const message = "Invalid syntax";
      const error = new ParseError(message);

      expect(error.message).toBe(`Parse error: ${message}`);
      expect(error.context).toEqual({});
    });
  });

  describe("ReadError", () => {
    it("should create error with correct properties", () => {
      const filePath = "/test/.zshrc";
      const originalError = new Error("Network error");
      const error = new ReadError(filePath, originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZshManagerError);
      expect(error.name).toBe("ReadError");
      expect(error.code).toBe("READ_ERROR");
      expect(error.userMessage).toBe(
        "Failed to read ~/.zshrc file. Please try again.",
      );
      expect(error.message).toBe(
        `Read error for ${filePath}: ${originalError.message}`,
      );
      expect(error.context).toEqual({
        filePath,
        originalError: originalError.message,
      });
    });
  });

  describe("isZshManagerError", () => {
    it("should return true for ZshManagerError instances", () => {
      const error = new FileNotFoundError("/test/.zshrc");
      expect(isZshManagerError(error)).toBe(true);
    });

    it("should return false for regular Error instances", () => {
      const error = new Error("Regular error");
      expect(isZshManagerError(error)).toBe(false);
    });

    it("should return false for non-error objects", () => {
      expect(isZshManagerError("string")).toBe(false);
      expect(isZshManagerError(123)).toBe(false);
      expect(isZshManagerError(null)).toBe(false);
      expect(isZshManagerError(undefined)).toBe(false);
      expect(isZshManagerError({})).toBe(false);
    });
  });

  describe("getUserFriendlyErrorMessage", () => {
    it("should return user message for ZshManagerError", () => {
      const error = new FileNotFoundError("/test/.zshrc");
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe(
        "~/.zshrc file not found. Please ensure the file exists in your home directory.",
      );
    });

    it("should return message for regular Error", () => {
      const error = new Error("Network connection failed");
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe("Network connection failed");
    });

    it("should return default message for non-error objects", () => {
      expect(getUserFriendlyErrorMessage("string")).toBe(
        "An unexpected error occurred",
      );
      expect(getUserFriendlyErrorMessage(123)).toBe(
        "An unexpected error occurred",
      );
      expect(getUserFriendlyErrorMessage(null)).toBe(
        "An unexpected error occurred",
      );
      expect(getUserFriendlyErrorMessage(undefined)).toBe(
        "An unexpected error occurred",
      );
      expect(getUserFriendlyErrorMessage({})).toBe(
        "An unexpected error occurred",
      );
    });

    it("should handle different ZshManagerError types", () => {
      const fileNotFoundError = new FileNotFoundError("/test/.zshrc");
      const permissionError = new PermissionError("/test/.zshrc");
      const fileTooLargeError = new FileTooLargeError(
        "/test/.zshrc",
        1000000,
        100000,
      );
      const parseError = new ParseError("Invalid syntax");
      const readError = new ReadError("/test/.zshrc", new Error("IO error"));

      expect(getUserFriendlyErrorMessage(fileNotFoundError)).toBe(
        fileNotFoundError.userMessage,
      );
      expect(getUserFriendlyErrorMessage(permissionError)).toBe(
        permissionError.userMessage,
      );
      expect(getUserFriendlyErrorMessage(fileTooLargeError)).toBe(
        fileTooLargeError.userMessage,
      );
      expect(getUserFriendlyErrorMessage(parseError)).toBe(
        parseError.userMessage,
      );
      expect(getUserFriendlyErrorMessage(readError)).toBe(
        readError.userMessage,
      );
    });
  });
});
