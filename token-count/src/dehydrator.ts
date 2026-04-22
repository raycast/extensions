/**
 * TokenCount Core: Semantic Code Dehydrator
 * Compress code to the extreme while preserving AI readability
 */

/**
 * Cursor Rules Generator
 * Extract rules from code and generate .cursorrules format
 */

export interface DehydratorResult {
  markdown: string;
  originalLength: number;
  compressedLength: number;
  savedPercent: number;
  variableMap: Map<string, string>;
}

export interface FunctionSignature {
  name: string;
  params: string[];
  returnType: string;
  body: string;
}

/**
 * Core dehydration algorithm
 * @param code Original code
 * @param options Optional configuration
 */
export async function dehydrate(
  code: string,
  options: {
    shortFunctionThreshold?: number;
    preserveComments?: boolean;
  } = {}
): Promise<DehydratorResult> {
  const { shortFunctionThreshold = 5 } = options;
  const originalLength = code.length;
  const variableMap = new Map<string, string>();

  let processed = code;

  // Stage 1: Remove comments
  processed = removeComments(processed);

  // Stage 2: Remove log statements
  processed = removeLogs(processed);

  // Stage 3: Extract function signatures
  const functionSignatures = extractSignatures(processed);
  processed = replaceWithSignatures(processed, functionSignatures, shortFunctionThreshold);

  // Stage 4: Shorten variables
  processed = shortenVariables(processed, variableMap);

  // Stage 5: Condense try-catch boilerplate
  processed = condenseTryCatch(processed);

  // Calculate compression results
  const compressedLength = processed.length;
  const savedPercent = Math.round((1 - compressedLength / originalLength) * 100);

  // Generate markdown
  const markdown = generateMarkdown(
    processed,
    savedPercent,
    variableMap,
    functionSignatures
  );

  return {
    markdown,
    originalLength,
    compressedLength,
    savedPercent: Math.max(0, savedPercent),
    variableMap,
  };
}

/**
 * Remove all comments
 */
function removeComments(code: string): string {
  // Single-line comments
  let result = code.replace(/\/\/.*$/gm, "");
  // Multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  return result;
}

/**
 * Remove log statements
 */
function removeLogs(code: string): string {
  return code
    .replace(/\bconsole\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/gi, "")
    .replace(/\bconsole\.log\s*\((['"`]).*\1\)\s*;?/gi, "")
    .replace(/logger\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/gi, "")
    .replace(/print\s*\([^)]*\)\s*;?/gi, "")
    .replace(/\bconsole\b\.?\w*\s*\(/gi, "");
}

/**
 * Extract all function signatures
 */
function extractSignatures(code: string): FunctionSignature[] {
  const signatures: FunctionSignature[] = [];

  // TypeScript/JavaScript 函数
  const funcPattern = /(?:(?:async\s+)?(?:function\s+)?|const\s+|let\s+|var\s+)?(\w+)\s*(?:=\s*(?:async\s+)?(?:\([^)]*\)|[^=]))?\s*(?:=>)?\s*\{([\s\S]*?)\n\}/g;

  let match;
  while ((match = funcPattern.exec(code)) !== null) {
    signatures.push({
      name: match[1],
      params: extractParams(match[0]),
      returnType: "",
      body: match[2],
    });
  }

  return signatures;
}

/**
 * Extract parameters from function
 */
function extractParams(funcStr: string): string[] {
  const paramMatch = funcStr.match(/\(([^)]*)\)/);
  if (!paramMatch) return [];
  return paramMatch[1]
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Replace function body with signature
 */
function replaceWithSignatures(
  code: string,
  signatures: FunctionSignature[],
  threshold: number
): string {
  let result = code;

  for (const sig of signatures) {
    const bodyLines = sig.body.split("\n").filter((l) => l.trim());
    if (bodyLines.length < threshold) {
      // Keep short functions
      continue;
    }

    // Replace with comment marker
    const signature = `${sig.name}(${sig.params.join(", ")})`;
    result = result.replace(
      sig.body,
      ` // [Logic: ${signature} - Hidden]`
    );
  }

  return result;
}

/**
 * Shorten variable names and generate mapping
 */
function shortenVariables(code: string, variableMap: Map<string, string>): string {
  // Local variable name mapping rules
  const commonPatterns = [
    { pattern: /\brequestData\b/g, short: "rd" },
    { pattern: /\bresponseData\b/g, short: "rsp" },
    { pattern: /\buserData\b/g, short: "ud" },
    { pattern: /\bconfig\b/g, short: "cfg" },
    { pattern: /\bcallback\b/g, short: "cb" },
    { pattern: /\bresult\b/g, short: "res" },
    { pattern: /\berror\b/g, short: "err" },
    { pattern: /\btemp\b/g, short: "tmp" },
    { pattern: /\bdata\b/g, short: "d" },
    { pattern: /\bitem\b/g, short: "i" },
    { pattern: /\bindex\b/g, short: "idx" },
    { pattern: /\bvalue\b/g, short: "v" },
    { pattern: /\boptions\b/g, short: "opts" },
    { pattern: /\bparameters?\b/g, short: "params" },
  ];

  let result = code;
  for (const { pattern, short } of commonPatterns) {
    const original = pattern.source.match(/\b\w+\b/)?.[0];
    if (original && !variableMap.has(original)) {
      variableMap.set(original, short);
    }
    result = result.replace(pattern, short);
  }

  return result;
}

/**
 * Condense try-catch
 */
function condenseTryCatch(code: string): string {
  return code.replace(
    /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?throw[^}]*;?\}?/gi,
    "// [Error handling hidden]"
  );
}

/**
 * Generate final markdown
 */
function generateMarkdown(
  content: string,
  savedPercent: number,
  variableMap: Map<string, string>,
  signatures: FunctionSignature[]
): string {
  const parts: string[] = [];

  // Wow effect title
  parts.push(`⚡ **Optimized by TokenCount** (Saved ${savedPercent}%)\n`);
  parts.push("---\n");

  // Code content
  parts.push("```\n" + content.trim() + "\n```\n");

  // Variable mapping table (if any)
  if (variableMap.size > 0) {
    parts.push("\n**Variable Mapping:**\n");
    parts.push("```\n");
    for (const [original, short] of variableMap) {
      parts.push(`  ${original} → ${short}\n`);
    }
    parts.push("```\n");
  }

  // Function signature table (if any)
  if (signatures.length > 0) {
    parts.push("\n**Function Signatures:**\n");
    parts.push("```\n");
    for (const sig of signatures) {
      parts.push(`  ${sig.name}(${sig.params.join(", ")})\n`);
    }
    parts.push("```\n");
  }

  return parts.join("");
}

export default dehydrate;