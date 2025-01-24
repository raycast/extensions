import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { readKeywords, writeKeywords } from "./lib/keywords-manager";

interface FormValues {
  keywords: string;
}

export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    validation: {
      keywords: (value) => {
        if (!value?.trim()) {
          return "关键词不能为空";
        }
      },
    },
    async onSubmit(values) {
      try {
        const keywordsList = values.keywords
          .split("\n")
          .map(k => k.trim())
          .filter(k => k.length > 0);

        await writeKeywords(keywordsList);

        showToast({
          style: Toast.Style.Success,
          title: "保存成功",
          message: `已更新 ${keywordsList.length} 个关键词`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "保存失败",
          message: String(error),
        });
      }
    },
  });

  useEffect(() => {
    async function loadKeywords() {
      try {
        const keywordsList = await readKeywords();
        console.log("Loading keywords:", keywordsList);
        setValue("keywords", keywordsList.join("\n"));
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "读取关键词失败",
          message: String(error),
        });
      }
    }
    loadKeywords();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="保存关键词" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="关键词列表"
        placeholder="每行输入一个关键词"
        {...itemProps.keywords}
      />
    </Form>
  );
}
