import { useState, useEffect, useRef } from "react";
import { 
  Detail, 
  ActionPanel, 
  Action, 
  showToast, 
  Toast, 
  environment,
  closeMainWindow,
  Icon,
  popToRoot,
  Clipboard,
  LocalStorage,
  LaunchProps,
  open
} from "@raycast/api";
import { exec, execFile } from "child_process";
import path from "path";
import fs from "fs";
import { translate } from 'google-translate-api-x';
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const TEMP_IMAGE_PATH = "/tmp/raycast-ocr-temp.png";

interface OCRLaunchContext {
  recognizedText?: string;
}

export default function Command(props: LaunchProps<{ launchContext: OCRLaunchContext }>) {
  const [displayText, setDisplayText] = useState<string>("");
  const [ocrText, setOcrText] = useState<string>(""); 
  const [viewMode, setViewMode] = useState<"WELCOME" | "RESULT">("WELCOME");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const hasStartedRef = useRef(false);

  // --- 💎 Enterprise-Grade Smart Formatting Engine ---
  // Designed for complex documents (Financial Reports, Academic Papers).
  // Precision handling for: Hierarchical Headers (2.4, 2.4.1), Roman Numerals (IV.), and Lists.
  const smartFormat = (text: string): string => {
    const lines = text.split('\n');
    const result: string[] = [];

    // Regex Definitions (The "Fingerprints")
    const patterns = {
      // 2.4, 2.4.1, 10.1.2 (Hierarchical Headings) - Crucial for financial reports
      hierarchical: /^(\d+(\.\d+)+)\.?\s?/,
      
      // 1., 2., 10. (Standard Numbered Lists)
      numbered: /^(\d+\.)\s?/,
      
      // I., IV., VI., ix. (Roman Numerals - Case Insensitive)
      roman: /^([IVXivx]+\.)\s?/,
      
      // (1), (a), [1] (Parenthesized Lists)
      parenthesis: /^(\(\w+\)|\[\w+\])\s?/,
      
      // •, -, *, > (Bullets)
      bullet: /^([•\-*➢>])\s?/
    };

    lines.forEach((line) => {
      let trimmed = line.trim();
      if (!trimmed) return;

      // --- Step 1: Normalization (Fix OCR spacing errors) ---
      // Example: "2.4Analysis" -> "2.4 Analysis"
      if (patterns.hierarchical.test(trimmed)) {
        trimmed = trimmed.replace(patterns.hierarchical, (match) => match.trim() + " ");
      } else if (patterns.numbered.test(trimmed)) {
        trimmed = trimmed.replace(patterns.numbered, (match) => match.trim() + " ");
      } else if (patterns.roman.test(trimmed)) {
        trimmed = trimmed.replace(patterns.roman, (match) => match.trim() + " ");
      } else if (patterns.bullet.test(trimmed)) {
        trimmed = trimmed.replace(patterns.bullet, (match) => match.trim() + " ");
      }

      // --- Step 2: Identify Line Identity ---
      const isHeaderOrList = 
        patterns.hierarchical.test(trimmed) || 
        patterns.numbered.test(trimmed) || 
        patterns.roman.test(trimmed) || 
        patterns.parenthesis.test(trimmed) || 
        patterns.bullet.test(trimmed);

      // --- Step 3: Layout Decision Logic ---
      
      if (result.length === 0) {
        result.push(trimmed);
        return;
      }

      const lastIndex = result.length - 1;
      const lastLine = result[lastIndex];

      // Rule A: If CURRENT line is a Header/List -> Force New Paragraph (Double Newline)
      if (isHeaderOrList) {
        // Exception: If the list is very tight (like a table of contents), sometimes single newline is preferred.
        // But for readability, we default to adding a gap before a new section header.
        result.push(""); 
        result.push(trimmed);
        return;
      }

      // Rule B: If PREVIOUS line was a Header/List -> Force New Paragraph
      // This prevents the body text from getting sucked into the title line.
      // Title: "2.4 Market Analysis"
      // Body: "The market is..." -> Should be on new line, not "2.4 Market Analysis The market is..."
      const lastWasHeaderOrList = 
        patterns.hierarchical.test(lastLine) || 
        patterns.numbered.test(lastLine) || 
        patterns.roman.test(lastLine) ||
        patterns.bullet.test(lastLine);

      if (lastWasHeaderOrList) {
        // Standard markdown behavior: Title on one line, body on next.
        // We push text as a new array item (which becomes a new line).
        result.push(trimmed); 
        return;
      }

      // Rule C: Standard Body Text Merging (The "Un-wrapping" Logic)
      // Check if previous line ended with a sentence stopper.
      const lastChar = lastLine.slice(-1);
      const isEndOfSentence = /[.:!?"']/.test(lastChar);
      
      if (isEndOfSentence) {
        // Previous sentence ended. This is likely a new paragraph.
        result.push(""); 
        result.push(trimmed);
      } else if (lastLine.endsWith('-')) {
        // Hyphenation Fix: "Strata-" + "gem" -> "Stratagem"
        result[lastIndex] = lastLine.slice(0, -1) + trimmed;
      } else {
        // Mid-sentence break: "The quick brown" + "fox jumps" -> "The quick brown fox jumps"
        result[lastIndex] = lastLine + " " + trimmed;
      }
    });

    return result.join('\n');
  };

  useEffect(() => {
    if (props.launchContext?.recognizedText) {
      const rawText = props.launchContext.recognizedText;
      const formatted = smartFormat(rawText);
      
      setOcrText(rawText);
      setDisplayText(formatted);
      setViewMode("RESULT");
      setIsLoading(false);
      
      Clipboard.copy(formatted);
      showToast({ style: Toast.Style.Success, title: "Formatted Text Copied" });
      return;
    }
    
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      checkFirstRun();
    }
  }, []);

  const checkFirstRun = async () => {
    const hasRun = await LocalStorage.getItem<boolean>("hasRunBefore");
    if (hasRun) {
      performCaptureAndOCR();
    } else {
      setIsLoading(false);
      setDisplayText(
`# 👋 Welcome to Smart OCR

### 🚀 Instructions
1. **Capture**: Press **Enter** to take a screenshot.
2. **Auto-Copy**: The text is professionally formatted and copied automatically.
3. **Translate**: Press **Cmd + Shift + C** to translate to **Chinese**.

> **Note**: This extension is optimized for **English documents**, ensuring perfect formatting for headings (2.4, IV.), lists, and paragraphs.
`
      );
    }
  };

  const performCaptureAndOCR = async () => {
    setIsLoading(true);
    await closeMainWindow(); 

    try {
      await LocalStorage.setItem("hasRunBefore", true);
      await execAsync(`/usr/sbin/screencapture -i -x -r "${TEMP_IMAGE_PATH}"`);

      if (!fs.existsSync(TEMP_IMAGE_PATH)) {
        setIsLoading(false);
        if (viewMode === "WELCOME") await popToRoot();
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Recognizing text..." });
      
      const scriptPath = path.join(environment.assetsPath, "ocr");
      const { stdout } = await execFileAsync(scriptPath, [TEMP_IMAGE_PATH]);
      const text = stdout.trim();
      fs.unlinkSync(TEMP_IMAGE_PATH);

      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "No text detected" });
        await popToRoot();
      } else {
        const contextData = encodeURIComponent(JSON.stringify({ recognizedText: text }));
        const deepLink = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/capture-ocr?launchContext=${contextData}`;
        await open(deepLink);
      }

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      showToast({ style: Toast.Style.Failure, title: "Error occurred" });
    }
  };

  const translateToChinese = async () => {
    const textToTranslate = displayText || ocrText; 
    if (!textToTranslate) return;
    
    setIsLoading(true);
    showToast({ style: Toast.Style.Animated, title: "Translating..." });

    try {
      const res = await translate(textToTranslate, { to: "zh-CN" });
      setDisplayText(res.text);
      await Clipboard.copy(res.text); 
      showToast({ style: Toast.Style.Success, title: "Translated & Copied" });
    } catch (error: any) {
      setIsLoading(false);
      setDisplayText(`# 😭 Translation Failed\n\nError: ${error.message}`);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={displayText}
      actions={
        <ActionPanel>
          {viewMode === "WELCOME" ? (
            <Action title="Start Capture" icon={Icon.Camera} onAction={performCaptureAndOCR} />
          ) : (
            <>
              <ActionPanel.Section title="Main Actions">
                <Action.CopyToClipboard title="Copy Formatted Text" content={displayText} />
                <Action
                  title="Translate to Chinese"
                  icon="🇨🇳"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={translateToChinese}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Utilities">
                <Action 
                  title="Retake Screenshot" 
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={performCaptureAndOCR} 
                />
                <Action 
                  title="Show Raw OCR Result" 
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={async () => {
                    setDisplayText(ocrText);
                    await Clipboard.copy(ocrText);
                    showToast({ title: "Raw OCR text restored" });
                  }} 
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}