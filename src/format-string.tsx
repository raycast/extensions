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
  separator: string;
  decorator: string;
}

const separatorOptions = [
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

export default function Command() {
  const [inputString, setInputString] = useState<string>("");
  const [separator, setSeparator] = useState<string>(",");
  const [decorator, setDecorator] = useState<string>("'");
  const [formattedResult, setFormattedResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 格式化字符串的核心逻辑
  const formatString = (input: string, sep: string, dec: string): string => {
    if (!input.trim()) {
      return "";
    }

    try {
      // 处理特殊分隔符
      const actualSeparator = sep === "\\t" ? "\t" : sep === "\\n" ? "\n" : sep;
      
      // 分割字符串并去除空白
      const parts = input.split(actualSeparator).map(part => part.trim()).filter(part => part.length > 0);
      
      if (parts.length === 0) {
        return "";
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

      return decoratedParts.join(",");
    } catch (err) {
      throw new Error("格式化过程中发生错误");
    }
  };

  // 实时更新格式化结果
  useEffect(() => {
    try {
      setError("");
      const result = formatString(inputString, separator, decorator);
      setFormattedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setFormattedResult("");
    }
  }, [inputString, separator, decorator]);

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
    setSeparator(",");
    setDecorator("'");
    setFormattedResult("");
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
      <Form.TextArea
        id="inputString"
        title="输入字符串"
        placeholder="请输入要格式化的字符串，例如：a,b,c"
        value={inputString}
        onChange={setInputString}
        error={error}
      />
      
      <Form.Dropdown
        id="separator"
        title="分隔符"
        value={separator}
        onChange={setSeparator}
      >
        {separatorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="decorator"
        title="修饰符"
        value={decorator}
        onChange={setDecorator}
      >
        {decoratorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Description
        title="预览结果"
        text={formattedResult || "输入字符串后将显示格式化结果"}
      />
    </Form>
  );
}