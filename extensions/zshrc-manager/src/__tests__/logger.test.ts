/**
 * Tests for logger.ts - Logging utility
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { LogLevel, setLogLevel, debug, info, warn, error, createLogger, log } from "../utils/logger";

describe("logger.ts", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset to DEBUG level before each test
    setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("LogLevel enum", () => {
    it("should have correct ordering", () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
    });

    it("should have numeric values", () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });

  describe("setLogLevel", () => {
    it("should filter out DEBUG messages when level is INFO", () => {
      setLogLevel(LogLevel.INFO);
      debug("test", "debug message");
      info("test", "info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[INFO]"));
    });

    it("should filter out DEBUG and INFO when level is WARN", () => {
      setLogLevel(LogLevel.WARN);
      debug("test", "debug message");
      info("test", "info message");
      warn("test", "warn message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it("should only allow ERROR when level is ERROR", () => {
      setLogLevel(LogLevel.ERROR);
      debug("test", "debug message");
      info("test", "info message");
      warn("test", "warn message");
      error("test", "error message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should allow all messages when level is DEBUG", () => {
      setLogLevel(LogLevel.DEBUG);
      debug("test", "debug message");
      info("test", "info message");
      warn("test", "warn message");
      error("test", "error message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("debug", () => {
    it("should log debug messages with correct format", () => {
      debug("testModule", "test message");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[zshrc-manager]"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[DEBUG]"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[testModule]"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("test message"));
    });

    it("should include timestamp in format", () => {
      debug("test", "message");

      const call = consoleLogSpy.mock.calls[0]?.[0];
      // ISO timestamp format: YYYY-MM-DDTHH:MM:SS
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should log additional data when provided", () => {
      const data = { key: "value" };
      debug("test", "message", data);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), data);
    });

    it("should not log data when undefined", () => {
      debug("test", "message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe("info", () => {
    it("should log info messages with correct format", () => {
      info("testModule", "test message");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[INFO]"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[testModule]"));
    });

    it("should include additional data when provided", () => {
      const data = [1, 2, 3];
      info("test", "message", data);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), data);
    });

    it("should not be filtered when level is INFO", () => {
      setLogLevel(LogLevel.INFO);
      info("test", "message");

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it("should be filtered when level is WARN", () => {
      setLogLevel(LogLevel.WARN);
      info("test", "message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("should log warn messages with correct format", () => {
      warn("testModule", "warning message");

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[WARN]"));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[testModule]"));
    });

    it("should include additional data when provided", () => {
      const data = { warning: true };
      warn("test", "message", data);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String), data);
    });

    it("should not be filtered when level is WARN", () => {
      setLogLevel(LogLevel.WARN);
      warn("test", "message");

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should be filtered when level is ERROR", () => {
      setLogLevel(LogLevel.ERROR);
      warn("test", "message");

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("error", () => {
    it("should log error messages with correct format", () => {
      error("testModule", "error message");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[ERROR]"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[testModule]"));
    });

    it("should include error object when provided", () => {
      const err = new Error("test error");
      error("test", "message", err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), err);
    });

    it("should never be filtered regardless of log level", () => {
      setLogLevel(LogLevel.ERROR);
      error("test", "message");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle non-Error error objects", () => {
      error("test", "message", "string error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), "string error");
    });

    it("should handle null/undefined error objects", () => {
      error("test", "message", null);
      error("test", "message", undefined);

      // Both calls include an error argument (null and undefined respectively)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("createLogger", () => {
    it("should create a logger with bound module name", () => {
      const logger = createLogger("myModule");

      logger.debug("debug msg");
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[myModule]"));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[myModule]"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[myModule]"));
    });

    it("should support data parameter", () => {
      const logger = createLogger("test");
      const data = { test: true };

      logger.debug("msg", data);
      logger.info("msg", data);
      logger.warn("msg", data);
      logger.error("msg", data);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), data);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String), data);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), data);
    });

    it("should respect log level", () => {
      const logger = createLogger("test");
      setLogLevel(LogLevel.ERROR);

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("pre-configured loggers (log object)", () => {
    it("should have zsh logger", () => {
      log.zsh.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[zsh]"));
    });

    it("should have parse logger", () => {
      log.parse.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[parse]"));
    });

    it("should have history logger", () => {
      log.history.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[history]"));
    });

    it("should have edit logger", () => {
      log.edit.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[edit]"));
    });

    it("should have delete logger", () => {
      log.delete.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[delete]"));
    });

    it("should have cache logger", () => {
      log.cache.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[cache]"));
    });

    it("should have preferences logger", () => {
      log.preferences.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[preferences]"));
    });

    it("should have ui logger", () => {
      log.ui.info("test");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[ui]"));
    });

    it("each pre-configured logger should have all methods", () => {
      const loggers = [log.zsh, log.parse, log.history, log.edit, log.delete, log.cache, log.preferences, log.ui];

      loggers.forEach((logger) => {
        expect(typeof logger.debug).toBe("function");
        expect(typeof logger.info).toBe("function");
        expect(typeof logger.warn).toBe("function");
        expect(typeof logger.error).toBe("function");
      });
    });
  });

  describe("message formatting", () => {
    it("should include LOG_PREFIX in all messages", () => {
      debug("test", "msg");
      info("test", "msg");
      warn("test", "msg");
      error("test", "msg");

      expect(consoleLogSpy.mock.calls[0]?.[0]).toContain("[zshrc-manager]");
      expect(consoleLogSpy.mock.calls[1]?.[0]).toContain("[zshrc-manager]");
      expect(consoleWarnSpy.mock.calls[0]?.[0]).toContain("[zshrc-manager]");
      expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain("[zshrc-manager]");
    });

    it("should format messages consistently", () => {
      info("myModule", "my message");

      const formatted = consoleLogSpy.mock.calls[0]?.[0];

      // Format: [zshrc-manager] TIMESTAMP [LEVEL] [MODULE] MESSAGE
      expect(formatted).toMatch(/^\[zshrc-manager\] \d{4}-\d{2}-\d{2}T.+ \[INFO\] \[myModule\] my message$/);
    });

    it("should handle special characters in messages", () => {
      info("test", "message with $pecial ch@racters!");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("message with $pecial ch@racters!"));
    });

    it("should handle empty messages", () => {
      info("test", "");

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it("should handle multiline messages", () => {
      info("test", "line1\nline2\nline3");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("line1\nline2\nline3"));
    });
  });
});
