import {
  MARKDOWN_PATTERNS,
  PLACEHOLDER_PREFIX,
  PLACEHOLDER_SUFFIX,
} from "../utils/regex-patterns";
import { Logger } from "../utils/logger";

interface ProtectedContent {
  placeholder: string;
  original: string;
}

export class MarkdownProtector {
  private protectedContents: ProtectedContent[] = [];
  private counter = 0;

  protect(text: string): string {
    Logger.log("MarkdownProtector: Starting protection");

    this.protectedContents = [];
    this.counter = 0;

    let result = text;

    result = this.protectCodeBlocks(result);
    result = this.protectInlineCode(result);
    result = this.protectUrls(result);
    result = this.protectFilePaths(result);

    Logger.log(
      `MarkdownProtector: Protected ${this.protectedContents.length} items`,
    );
    return result;
  }

  restore(text: string): string {
    Logger.log("MarkdownProtector: Starting restoration");

    let result = text;

    for (const { placeholder, original } of this.protectedContents) {
      result = result.split(placeholder).join(original);
    }

    Logger.log("MarkdownProtector: Restoration completed");
    return result;
  }

  private createPlaceholder(): string {
    return `${PLACEHOLDER_PREFIX}${this.counter++}${PLACEHOLDER_SUFFIX}`;
  }

  private protectCodeBlocks(text: string): string {
    return text.replace(MARKDOWN_PATTERNS.CODE_BLOCK, (match) => {
      const placeholder = this.createPlaceholder();
      this.protectedContents.push({ placeholder, original: match });
      return placeholder;
    });
  }

  private protectInlineCode(text: string): string {
    return text.replace(MARKDOWN_PATTERNS.INLINE_CODE, (match) => {
      const placeholder = this.createPlaceholder();
      this.protectedContents.push({ placeholder, original: match });
      return placeholder;
    });
  }

  private protectUrls(text: string): string {
    return text.replace(MARKDOWN_PATTERNS.URL, (match) => {
      const placeholder = this.createPlaceholder();
      this.protectedContents.push({ placeholder, original: match });
      return placeholder;
    });
  }

  private protectFilePaths(text: string): string {
    return text.replace(MARKDOWN_PATTERNS.FILE_PATH, (match) => {
      const placeholder = this.createPlaceholder();
      this.protectedContents.push({ placeholder, original: match });
      return placeholder;
    });
  }
}
