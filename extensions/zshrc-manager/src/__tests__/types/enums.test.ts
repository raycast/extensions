import { describe, it, expect } from "vitest";
import {
  EntryType,
  SectionMarkerType,
  ErrorCode,
  EntryIcon,
  SectionIcon,
  ToastStyle,
  ValidationState,
  LoadingState,
} from "../../types/enums";

describe("types/enums.ts", () => {
  describe("EntryType", () => {
    it("should have all expected enum values", () => {
      expect(EntryType.ALIAS).toBe("alias");
      expect(EntryType.EXPORT).toBe("export");
      expect(EntryType.EVAL).toBe("eval");
      expect(EntryType.SETOPT).toBe("setopt");
      expect(EntryType.PLUGIN).toBe("plugin");
      expect(EntryType.FUNCTION).toBe("function");
      expect(EntryType.SOURCE).toBe("source");
      expect(EntryType.AUTOLOAD).toBe("autoload");
      expect(EntryType.FPATH).toBe("fpath");
      expect(EntryType.PATH).toBe("path");
      expect(EntryType.THEME).toBe("theme");
      expect(EntryType.COMPLETION).toBe("completion");
      expect(EntryType.HISTORY).toBe("history");
      expect(EntryType.KEYBINDING).toBe("keybinding");
      expect(EntryType.OTHER).toBe("other");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(EntryType);
      expect(keys).toContain("ALIAS");
      expect(keys).toContain("EXPORT");
      expect(keys).toContain("EVAL");
      expect(keys).toContain("SETOPT");
      expect(keys).toContain("PLUGIN");
      expect(keys).toContain("FUNCTION");
      expect(keys).toContain("SOURCE");
      expect(keys).toContain("AUTOLOAD");
      expect(keys).toContain("FPATH");
      expect(keys).toContain("PATH");
      expect(keys).toContain("THEME");
      expect(keys).toContain("COMPLETION");
      expect(keys).toContain("HISTORY");
      expect(keys).toContain("KEYBINDING");
      expect(keys).toContain("OTHER");
    });
  });

  describe("SectionMarkerType", () => {
    it("should have all expected enum values", () => {
      expect(SectionMarkerType.LABELED).toBe("labeled");
      expect(SectionMarkerType.DASHED_START).toBe("dashed_start");
      expect(SectionMarkerType.DASHED_END).toBe("dashed_end");
      expect(SectionMarkerType.BRACKETED).toBe("bracketed");
      expect(SectionMarkerType.HASH).toBe("hash");
      expect(SectionMarkerType.CUSTOM_START).toBe("custom_start");
      expect(SectionMarkerType.CUSTOM_END).toBe("custom_end");
      expect(SectionMarkerType.FUNCTION_START).toBe("function_start");
      expect(SectionMarkerType.FUNCTION_END).toBe("function_end");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(SectionMarkerType);
      expect(keys).toContain("LABELED");
      expect(keys).toContain("DASHED_START");
      expect(keys).toContain("DASHED_END");
      expect(keys).toContain("BRACKETED");
      expect(keys).toContain("HASH");
      expect(keys).toContain("CUSTOM_START");
      expect(keys).toContain("CUSTOM_END");
      expect(keys).toContain("FUNCTION_START");
      expect(keys).toContain("FUNCTION_END");
    });
  });

  describe("ErrorCode", () => {
    it("should have all expected enum values", () => {
      expect(ErrorCode.FILE_NOT_FOUND).toBe("FILE_NOT_FOUND");
      expect(ErrorCode.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
      expect(ErrorCode.FILE_TOO_LARGE).toBe("FILE_TOO_LARGE");
      expect(ErrorCode.READ_ERROR).toBe("READ_ERROR");
      expect(ErrorCode.WRITE_ERROR).toBe("WRITE_ERROR");
      expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCode.PARSE_ERROR).toBe("PARSE_ERROR");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(ErrorCode);
      expect(keys).toContain("FILE_NOT_FOUND");
      expect(keys).toContain("PERMISSION_DENIED");
      expect(keys).toContain("FILE_TOO_LARGE");
      expect(keys).toContain("READ_ERROR");
      expect(keys).toContain("WRITE_ERROR");
      expect(keys).toContain("VALIDATION_ERROR");
      expect(keys).toContain("PARSE_ERROR");
    });
  });

  describe("EntryIcon", () => {
    it("should have all expected enum values", () => {
      expect(EntryIcon.ALIAS).toBe("Terminal");
      expect(EntryIcon.EXPORT).toBe("EnvironmentVariable");
      expect(EntryIcon.EVAL).toBe("Code");
      expect(EntryIcon.SETOPT).toBe("Gear");
      expect(EntryIcon.PLUGIN).toBe("PuzzlePiece");
      expect(EntryIcon.FUNCTION).toBe("Function");
      expect(EntryIcon.SOURCE).toBe("Document");
      expect(EntryIcon.AUTOLOAD).toBe("Download");
      expect(EntryIcon.FPATH).toBe("Folder");
      expect(EntryIcon.PATH).toBe("Path");
      expect(EntryIcon.THEME).toBe("Palette");
      expect(EntryIcon.COMPLETION).toBe("CheckCircle");
      expect(EntryIcon.HISTORY).toBe("Clock");
      expect(EntryIcon.KEYBINDING).toBe("Keyboard");
      expect(EntryIcon.OTHER).toBe("File");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(EntryIcon);
      expect(keys).toContain("ALIAS");
      expect(keys).toContain("EXPORT");
      expect(keys).toContain("EVAL");
      expect(keys).toContain("SETOPT");
      expect(keys).toContain("PLUGIN");
      expect(keys).toContain("FUNCTION");
      expect(keys).toContain("SOURCE");
      expect(keys).toContain("AUTOLOAD");
      expect(keys).toContain("FPATH");
      expect(keys).toContain("PATH");
      expect(keys).toContain("THEME");
      expect(keys).toContain("COMPLETION");
      expect(keys).toContain("HISTORY");
      expect(keys).toContain("KEYBINDING");
      expect(keys).toContain("OTHER");
    });
  });

  describe("SectionIcon", () => {
    it("should have all expected enum values", () => {
      expect(SectionIcon.GENERAL).toBe("Gear");
      expect(SectionIcon.ALIASES).toBe("Terminal");
      expect(SectionIcon.EXPORTS).toBe("EnvironmentVariable");
      expect(SectionIcon.FUNCTIONS).toBe("Function");
      expect(SectionIcon.PLUGINS).toBe("PuzzlePiece");
      expect(SectionIcon.SOURCES).toBe("Document");
      expect(SectionIcon.EVALS).toBe("Code");
      expect(SectionIcon.SETOPTS).toBe("Settings");
      expect(SectionIcon.THEMES).toBe("Palette");
      expect(SectionIcon.COMPLETIONS).toBe("CheckCircle");
      expect(SectionIcon.HISTORY).toBe("Clock");
      expect(SectionIcon.KEYBINDINGS).toBe("Keyboard");
      expect(SectionIcon.OTHER).toBe("File");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(SectionIcon);
      expect(keys).toContain("GENERAL");
      expect(keys).toContain("ALIASES");
      expect(keys).toContain("EXPORTS");
      expect(keys).toContain("FUNCTIONS");
      expect(keys).toContain("PLUGINS");
      expect(keys).toContain("SOURCES");
      expect(keys).toContain("EVALS");
      expect(keys).toContain("SETOPTS");
      expect(keys).toContain("THEMES");
      expect(keys).toContain("COMPLETIONS");
      expect(keys).toContain("HISTORY");
      expect(keys).toContain("KEYBINDINGS");
      expect(keys).toContain("OTHER");
    });
  });

  describe("ToastStyle", () => {
    it("should have all expected enum values", () => {
      expect(ToastStyle.SUCCESS).toBe("SUCCESS");
      expect(ToastStyle.FAILURE).toBe("FAILURE");
      expect(ToastStyle.ANIMATION).toBe("ANIMATION");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(ToastStyle);
      expect(keys).toContain("SUCCESS");
      expect(keys).toContain("FAILURE");
      expect(keys).toContain("ANIMATION");
    });
  });

  describe("ValidationState", () => {
    it("should have all expected enum values", () => {
      expect(ValidationState.VALID).toBe("valid");
      expect(ValidationState.INVALID).toBe("invalid");
      expect(ValidationState.PENDING).toBe("pending");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(ValidationState);
      expect(keys).toContain("VALID");
      expect(keys).toContain("INVALID");
      expect(keys).toContain("PENDING");
    });
  });

  describe("LoadingState", () => {
    it("should have all expected enum values", () => {
      expect(LoadingState.IDLE).toBe("idle");
      expect(LoadingState.LOADING).toBe("loading");
      expect(LoadingState.SUCCESS).toBe("success");
      expect(LoadingState.ERROR).toBe("error");
    });

    it("should have all expected keys", () => {
      const keys = Object.keys(LoadingState);
      expect(keys).toContain("IDLE");
      expect(keys).toContain("LOADING");
      expect(keys).toContain("SUCCESS");
      expect(keys).toContain("ERROR");
    });
  });

  describe("Enum consistency", () => {
    it("should have matching EntryType and EntryIcon keys", () => {
      const entryKeys = Object.keys(EntryType);
      const iconKeys = Object.keys(EntryIcon);

      // EntryIcon should have the same keys as EntryType
      entryKeys.forEach((key) => {
        expect(iconKeys).toContain(key);
      });
    });

    it("should have consistent enum value types", () => {
      // All enum values should be strings
      Object.values(EntryType).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(SectionMarkerType).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(ErrorCode).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(EntryIcon).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(SectionIcon).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(ToastStyle).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(ValidationState).forEach((value) => {
        expect(typeof value).toBe("string");
      });
      Object.values(LoadingState).forEach((value) => {
        expect(typeof value).toBe("string");
      });
    });
  });
});
