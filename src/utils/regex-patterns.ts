import { GREEK_CHAR_RANGE, ZH_CHARS_START, ZH_CHARS_END } from "./constants";

const ZH_RANGE = `[${ZH_CHARS_START}-${ZH_CHARS_END}]`;

export const SPACE_PATTERNS = [
  {
    name: "cn_en_quote",
    pattern: new RegExp(`(${ZH_RANGE})(["'])`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "quote_cn",
    pattern: new RegExp(`(["'])(${ZH_RANGE})`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "cn_en",
    pattern: new RegExp(
      `(${ZH_RANGE})([A-Za-z0-9@&%=\\$\\^\\*\\-+\\/\\\\\\|_])`,
      "g",
    ),
    replacement: "$1 $2",
  },
  {
    name: "en_cn",
    pattern: new RegExp(
      `([A-Za-z0-9~!%&=;\\|,\\.:?\\$\\^\\*\\-+\\/\\\\_])(${ZH_RANGE})`,
      "g",
    ),
    replacement: "$1 $2",
  },
  {
    name: "en_punctuation_en",
    pattern: /([A-Za-z0-9])([,.?!:;)])([A-Za-z])/g,
    replacement: "$1$2 $3",
  },
  {
    name: "en_left_bracket_en",
    pattern: /([A-Za-z0-9])([[{])/g,
    replacement: "$1 $2",
  },
  {
    name: "en_right_bracket_en",
    pattern: /([\]}])([A-Za-z0-9])/g,
    replacement: "$1 $2",
  },
  {
    name: "zh_en_punctuation",
    pattern: new RegExp(`(${ZH_RANGE})([,.?!:;)(])`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "en_punctuation_zh",
    pattern: new RegExp(`([,.?!:;)(])(${ZH_RANGE})`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "zh_bracket",
    pattern: new RegExp(`(${ZH_RANGE})([<\\[\\{\\(])`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "bracket_zh",
    pattern: new RegExp(`([>\\]\\}\\)])(${ZH_RANGE})`, "g"),
    replacement: "$1 $2",
  },
  {
    name: "digit_en",
    pattern: /([0-9])([A-Za-z])/g,
    replacement: "$1 $2",
  },
  {
    name: "en_digit",
    pattern: /([A-Za-z])([0-9])/g,
    replacement: "$1 $2",
  },
  {
    name: "zh_greek",
    pattern: new RegExp(`(${ZH_RANGE})([${GREEK_CHAR_RANGE}])`, "gu"),
    replacement: "$1 $2",
  },
  {
    name: "greek_zh",
    pattern: new RegExp(`([${GREEK_CHAR_RANGE}])(${ZH_RANGE})`, "gu"),
    replacement: "$1 $2",
  },
  {
    name: "en_greek",
    pattern: new RegExp(`([A-Za-z])([${GREEK_CHAR_RANGE}])`, "gu"),
    replacement: "$1 $2",
  },
  {
    name: "greek_en",
    pattern: new RegExp(`([${GREEK_CHAR_RANGE}])([A-Za-z])`, "gu"),
    replacement: "$1 $2",
  },
];

export const REMOVE_SPACE_PATTERNS = [
  {
    name: "zh_zh",
    pattern: new RegExp(`(${ZH_RANGE})\\s+(${ZH_RANGE})`, "g"),
    replacement: "$1$2",
  },
  {
    name: "zh_en_punctuation_close",
    pattern: new RegExp(`(${ZH_RANGE})\\s+([,\\.?!\\):;])`, "g"),
    replacement: "$1$2",
  },
  {
    name: "en_punctuation_open_zh",
    pattern: new RegExp(`([\\(\\[@#\\$])\\s+(${ZH_RANGE})`, "g"),
    replacement: "$1$2",
  },
  {
    name: "zh_punctuation_en",
    pattern: new RegExp(`([，。？！：；）】》])\\s+([A-Za-z0-9])`, "g"),
    replacement: "$1$2",
  },
  {
    name: "en_zh_punctuation",
    pattern: new RegExp(`([A-Za-z0-9])\\s+([（【《￥])`, "g"),
    replacement: "$1$2",
  },
];

export const MARKDOWN_PATTERNS = {
  CODE_BLOCK: /```[\s\S]*?```/g,
  INLINE_CODE: /`[^`\n]+`/g,
  URL: /(https?:\/\/[^\s]+)/g,
  FILE_PATH: /\/[^\s]+\.[^\s\])]+/g,
};

export const FULL_WIDTH_PATTERN =
  /[０-９Ａ-Ｚａ-ｚ－／．％＃＠＆＜＞［］｛｝＼｜＋＝＿＾｀]/g;

export const PLACEHOLDER_PREFIX = "__MARKDOWN_PLACEHOLDER_";
export const PLACEHOLDER_SUFFIX = "_";
