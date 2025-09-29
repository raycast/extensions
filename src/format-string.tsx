import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  showHUD,
} from "@raycast/api";

interface FormValues {
  inputString: string;
  removeChars: string;
  separator: string;
  decorator: string;
  outputSeparator: string;
}

const separatorOptions = [
  { title: "自动检测", value: "" },
  { title: "逗号 (,)", value: "," },
  { title: "分号 (;)", value: ";" },
  { title: "空格 ( )", value: " " },
  { title: "竖线 (|)", value: "|" },
  { title: "制表符 (\\t)", value: "\t" },
  { title: "换行符 (\\n)", value: "\n" },
];

const decoratorOptions = [
  { title: "单引号 (')", value: "'" },
  { title: "双引号 (\")", value: '"' },
  { title: "反引号 (`)", value: "`" },
  { title: "方括号 []", value: "[]" },
  { title: "圆括号 ()", value: "()" },
  { title: "花括号 {}", value: "{}" },
  { title: "无修饰符", value: "" },
];

const outputSeparatorOptions = [
  { title: "逗号 (,)", value: "," },
  { title: "分号 (;)", value: ";" },
  { title: "空格 ( )", value: " " },
  { title: "竖线 (|)", value: "|" },
  { title: "制表符 (\\t)", value: "\t" },
  { title: "换行符 (\\n)", value: "\n" },
];

export default function Command() {
  const [inputString, setInputString] = useState<string>("");
  const [removeChars, setRemoveChars] = useState<string>("");
  const [separator, setSeparator] = useState<string>("");
  const [decorator, setDecorator] = useState<string>("'");
  const [outputSeparator, setOutputSeparator] = useState<string>(",");
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);
  const [formattedResult, setFormattedResult] = useState<string>("");
  const [detectedSeparator, setDetectedSeparator] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 自动检测分隔符
  const detectSeparator = (input: string): string => {
    if (!input.trim()) return "";
    
    const separators = [",", ";", "|", " ", "\t", "\n"];
    
    for (const sep of separators) {
      if (input.includes(sep)) {
        return sep;
      }
    }
    
    return "";
  };

  // 格式化字符串的核心逻辑
  const formatString = (input: string, removeCh: string, sep: string, dec: string, outSep: string, dedup: boolean): string => {
    if (!input.trim()) {
      return "";
    }

    try {
      let processedInput = input;
      
      // 移除指定字符
      if (removeCh.trim()) {
        const charsToRemove = removeCh.split('').map(char => 
          char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        const removeRegex = new RegExp(`[${charsToRemove.join('')}]`, 'g');
        processedInput = processedInput.replace(removeRegex, '');
      }
      
      // 确定使用的分隔符
      let actualSeparator = sep;
      if (!actualSeparator) {
        actualSeparator = detectSeparator(processedInput);
        setDetectedSeparator(actualSeparator);
      }
      
      if (!actualSeparator) {
        // 如果没有检测到分隔符，将整个字符串作为单个元素
        const trimmed = processedInput.trim();
        if (!trimmed) return "";
        
        if (dec === "[]") {
          return `[${trimmed}]`;
        } else if (dec === "()") {
          return `(${trimmed})`;
        } else if (dec === "{}") {
          return `{${trimmed}}`;
        } else if (dec === "") {
          return trimmed;
        } else {
          return `${dec}${trimmed}${dec}`;
        }
      }
      
      // 处理特殊分隔符
      const finalSeparator = actualSeparator === "\\t" ? "\t" : actualSeparator === "\\n" ? "\n" : actualSeparator;
      
      // 分割字符串并去除空白
      let parts = processedInput.split(finalSeparator).map(part => part.trim()).filter(part => part.length > 0);
      
      if (parts.length === 0) {
        return "";
      }

      // 去重处理
      if (dedup) {
        parts = Array.from(new Set(parts));
      }

      // 应用修饰符
      let decoratedParts: string[];
      
      if (dec === "[]") {
        decoratedParts = parts.map(part => `[${part}]`);
      } else if (dec === "()") {
        decoratedParts = parts.map(part => `(${part})`);
      } else if (dec === "{}") {
        decoratedParts = parts.map(part => `{${part}}`);
      } else if (dec === "") {
        decoratedParts = parts;
      } else {
        decoratedParts = parts.map(part => `${dec}${part}${dec}`);
      }

      // 使用指定的输出分隔符
      const finalOutputSeparator = outSep === "\\t" ? "\t" : outSep === "\\n" ? "\n" : outSep;
      return decoratedParts.join(finalOutputSeparator);
    } catch (err) {
      throw new Error("格式化过程中发生错误");
    }
  };

  // 实时更新格式化结果
  useEffect(() => {
    try {
      setError("");
      const result = formatString(inputString, removeChars, separator, decorator, outputSeparator, removeDuplicates);
      setFormattedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setFormattedResult("");
    }
  }, [inputString, removeChars, separator, decorator, outputSeparator, removeDuplicates]);

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!formattedResult) {
      await showToast({
        style: Toast.Style.Failure,
        title: "没有可复制的内容",
        message: "请先输入要格式化的字符串",
      });
      return;
    }

    try {
      await Clipboard.copy(formattedResult);
      await showHUD("✅ 已复制到剪贴板");
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "复制失败",
        message: "无法复制到剪贴板",
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setInputString("");
    setRemoveChars("");
    setSeparator("");
    setDecorator("'");
    setOutputSeparator(",");
    setRemoveDuplicates(true);
    setFormattedResult("");
    setDetectedSeparator("");
    setError("");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="复制结果"
            onAction={copyToClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="重置"
            onAction={resetForm}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {/* 输入区域 */}
      <Form.TextArea
        id="inputString"
        title="输入字符串"
        placeholder="请输入要格式化的字符串，例如：a,b,c"
        value={inputString}
        onChange={setInputString}
        error={error}
      />
      
      <Form.TextField
        id="removeChars"
        title="移除字符"
        placeholder="输入要移除的字符，例如：()[]"
        value={removeChars}
        onChange={setRemoveChars}
        info="指定要从输入字符串中移除的字符"
      />
      
      <Form.Dropdown
        id="separator"
        title="输入分隔符"
        value={separator}
        onChange={setSeparator}
        info={detectedSeparator ? `检测到分隔符: ${detectedSeparator}` : "自动检测或手动选择分隔符"}
      >
        {separatorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      {/* 分隔线 */}
      <Form.Separator />

      {/* 输出区域 */}
      <Form.Dropdown
        id="decorator"
        title="修饰符"
        value={decorator}
        onChange={setDecorator}
        info="为每个元素添加的包装符号"
      >
        {decoratorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="outputSeparator"
        title="输出分隔符"
        value={outputSeparator}
        onChange={setOutputSeparator}
        info="格式化结果中元素之间的分隔符"
      >
        {outputSeparatorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="removeDuplicates"
        title="去重选项"
        label="移除重复项"
        value={removeDuplicates}
        onChange={setRemoveDuplicates}
        info="自动移除输出结果中的重复元素"
      />

      <Form.Description
        title="预览结果"
        text={formattedResult || "输入字符串后将显示格式化结果"}
      />
    </Form>
  );
}