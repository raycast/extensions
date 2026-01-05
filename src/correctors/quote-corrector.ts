import { BaseCorrector } from "./base-corrector";
import { CHINESE_PUNCTUATION } from "../utils/constants";
import { isEnLetter } from "../utils/character-types";
import { Logger } from "../utils/logger";

export class QuoteCorrector extends BaseCorrector {
  handle(text: string): string {
    Logger.log("QuoteCorrector: Starting");

    let result = text;

    result = this.fixDoubleQuotes(result);
    result = this.fixSingleQuotes(result);

    Logger.log("QuoteCorrector: Completed");
    return result;
  }

  private fixDoubleQuotes(text: string): string {
    const chars = text.split("");
    let quoteState = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (char === '"' || char === "「" || char === "」") {
        if (quoteState === 0) {
          chars[i] = CHINESE_PUNCTUATION.LEFT_SINGLE_QUOTE;
          quoteState = 1;

          if (i > 0 && chars[i - 1] === " ") {
            chars[i - 1] = "";
          }
          if (i < chars.length - 1 && chars[i + 1] === " ") {
            chars[i + 1] = "";
          }
        } else {
          chars[i] = CHINESE_PUNCTUATION.RIGHT_SINGLE_QUOTE;
          quoteState = 0;

          if (i > 0 && chars[i - 1] === " ") {
            chars[i - 1] = "";
          }
          if (i < chars.length - 1 && chars[i + 1] === " ") {
            chars[i + 1] = "";
          }
        }
      }
    }

    return chars.join("");
  }

  private fixSingleQuotes(text: string): string {
    const chars = text.split("");
    let quoteState = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (char === "'") {
        // Skip apostrophe (e.g. It's, I'm)
        if (
          i > 0 &&
          i < chars.length - 1 &&
          isEnLetter(chars[i - 1]) &&
          isEnLetter(chars[i + 1])
        ) {
          continue;
        }

        if (quoteState === 0) {
          chars[i] = "「";
          quoteState = 1;

          if (i > 0 && chars[i - 1] === " ") {
            chars[i - 1] = "";
          }
          if (i < chars.length - 1 && chars[i + 1] === " ") {
            chars[i + 1] = "";
          }
        } else {
          chars[i] = "」";
          quoteState = 0;

          if (i > 0 && chars[i - 1] === " ") {
            chars[i - 1] = "";
          }
          if (i < chars.length - 1 && chars[i + 1] === " ") {
            chars[i + 1] = "";
          }
        }
      }
    }

    return chars.join("");
  }
}
