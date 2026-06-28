import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { ZeaburEmailPayload, ZeaburEmailAttachment } from "./type";
import { sendEmail, scheduleEmail } from "./utils/zeabur-email";

interface SendEmailFormValues {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  cc: string;
  bcc: string;
  replyTo: string;
  enableSchedule: boolean;
  scheduledAt: Date | null;
  attachments: string[];
  tags: string;
}

function parseEmailList(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmailList(value: string | undefined, fieldName: string, required: boolean): string | undefined {
  if (!value || !value.trim()) {
    return required ? `${fieldName} is required` : undefined;
  }
  const emails = parseEmailList(value);
  for (const email of emails) {
    if (!EMAIL_REGEX.test(email)) {
      return `Invalid email address: ${email}`;
    }
  }
  return undefined;
}

function parseTags(value: string): { tags?: Record<string, string>; error?: string } {
  if (!value.trim()) return {};
  const tags: Record<string, string> = {};
  const pairs = value.split(",").map((pair) => pair.trim());
  for (const pair of pairs) {
    if (!pair) continue;
    const [key, ...valueParts] = pair.split(":");
    if (!key?.trim() || valueParts.length === 0) {
      return { error: `Invalid tag format: "${pair}". Expected key:value` };
    }
    tags[key.trim()] = valueParts.join(":").trim();
  }
  return { tags: Object.keys(tags).length > 0 ? tags : undefined };
}

async function readAttachments(filePaths: string[]): Promise<ZeaburEmailAttachment[]> {
  const attachments: ZeaburEmailAttachment[] = [];
  for (const filePath of filePaths) {
    const fileBuffer = await fs.promises.readFile(filePath);
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    if (fileSizeMB > 10) {
      throw new Error(
        `Attachment "${path.basename(filePath)}" is ${fileSizeMB.toFixed(1)} MB, exceeds maximum of 10 MB`,
      );
    }
    const base64Content = fileBuffer.toString("base64");
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".zip": "application/zip",
      ".gz": "application/gzip",
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".ts": "application/typescript",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".webp": "image/webp",
    };

    attachments.push({
      filename,
      content: base64Content,
      content_type: mimeTypes[ext] || "application/octet-stream",
    });
  }
  return attachments;
}

export default function Command() {
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, reset } = useForm<SendEmailFormValues>({
    async onSubmit(values) {
      setIsSubmitting(true);
      try {
        const toList = parseEmailList(values.to);
        const ccList = parseEmailList(values.cc);
        const bccList = parseEmailList(values.bcc);
        const replyToList = parseEmailList(values.replyTo);
        const { tags, error: tagsError } = parseTags(values.tags);
        if (tagsError) {
          await showToast({ style: Toast.Style.Failure, title: "Invalid tags", message: tagsError });
          return;
        }

        if (!values.html.trim() && !values.text.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Content required",
            message: "At least one of HTML or Text content is required",
          });
          return;
        }

        const totalRecipients = toList.length + ccList.length + bccList.length;
        if (totalRecipients > 50) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Too many recipients",
            message: `Total recipients (${totalRecipients}) exceeds maximum of 50`,
          });
          return;
        }

        let attachments: ZeaburEmailAttachment[] | undefined;
        if (values.attachments && values.attachments.length > 0) {
          if (values.attachments.length > 10) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Too many attachments",
              message: "Maximum 10 attachments allowed",
            });
            return;
          }
          attachments = await readAttachments(values.attachments);
        }

        const payload: ZeaburEmailPayload = {
          from: values.from.trim(),
          to: toList,
          subject: values.subject.trim(),
          ...(values.html.trim() && { html: values.html.trim() }),
          ...(values.text.trim() && { text: values.text.trim() }),
          ...(ccList.length > 0 && { cc: ccList }),
          ...(bccList.length > 0 && { bcc: bccList }),
          ...(replyToList.length > 0 && { reply_to: replyToList }),
          ...(attachments && attachments.length > 0 && { attachments }),
          ...(tags && { tags }),
        };

        await showToast({
          style: Toast.Style.Animated,
          title: isScheduleEnabled ? "Scheduling email..." : "Sending email...",
        });

        if (isScheduleEnabled && values.scheduledAt) {
          payload.scheduled_at = values.scheduledAt.toISOString();
          const result = await scheduleEmail(payload);
          await showToast({
            style: Toast.Style.Success,
            title: "Email scheduled",
            message: `ID: ${result.id} | Status: ${result.status}`,
          });
        } else if (isScheduleEnabled && !values.scheduledAt) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Schedule time required",
            message: "Please select a schedule time or disable scheduling",
          });
          return;
        } else {
          const result = await sendEmail(payload);
          await showToast({
            style: Toast.Style.Success,
            title: "Email sent",
            message: `ID: ${result.id} | Status: ${result.status}`,
          });
        }

        reset({
          from: "",
          to: "",
          subject: "",
          html: "",
          text: "",
          cc: "",
          bcc: "",
          replyTo: "",
          enableSchedule: false,
          scheduledAt: null,
          attachments: [],
          tags: "",
        });
        setIsScheduleEnabled(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to send email",
          message: errorMessage,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      from: (value) => {
        if (!value || !value.trim()) return "Sender email is required";
        if (!value.includes("@")) return "Invalid email address";
        return undefined;
      },
      to: (value) => validateEmailList(value, "Recipient", true),
      subject: (value) => {
        if (!value || !value.trim()) return "Subject is required";
        if (value.length > 998) return `Subject length (${value.length}) exceeds maximum (998 characters)`;
        return undefined;
      },

      cc: (value) => validateEmailList(value, "CC", false),
      bcc: (value) => validateEmailList(value, "BCC", false),
      replyTo: (value) => validateEmailList(value, "Reply To", false),
      scheduledAt: (value) => {
        if (!isScheduleEnabled) return undefined;
        if (!value) return "Schedule time is required when scheduling is enabled";
        if (new Date(value) <= new Date()) return "Schedule time must be in the future";
        return undefined;
      },
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isScheduleEnabled ? "Schedule Email" : "Send Email"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="From"
        placeholder="sender@yourdomain.com"
        info="Sender email address. Domain must be verified in Zeabur Email."
        {...itemProps.from}
      />
      <Form.TextField
        title="To"
        placeholder="user@example.com, user2@example.com"
        info="Comma-separated list of recipient email addresses"
        {...itemProps.to}
      />
      <Form.TextField
        title="Subject"
        placeholder="Email subject"
        info="Maximum 998 characters"
        {...itemProps.subject}
      />

      <Form.Separator />

      <Form.TextArea
        title="HTML Content"
        placeholder="<h1>Hello!</h1><p>Your HTML email content here.</p>"
        info="HTML format email content. At least one of HTML or Text is required."
        enableMarkdown={false}
        {...itemProps.html}
      />
      <Form.TextArea
        title="Text Content"
        placeholder="Plain text email content"
        info="Plain text fallback. Shown in clients that don't support HTML."
        {...itemProps.text}
      />

      <Form.Separator />

      <Form.TextField
        title="CC (Optional)"
        placeholder="cc@example.com"
        info="Comma-separated CC addresses"
        {...itemProps.cc}
      />
      <Form.TextField
        title="BCC (Optional)"
        placeholder="bcc@example.com"
        info="Comma-separated BCC addresses"
        {...itemProps.bcc}
      />
      <Form.TextField
        title="Reply To (Optional)"
        placeholder="reply@yourdomain.com"
        info="Comma-separated reply-to addresses"
        {...itemProps.replyTo}
      />

      <Form.Separator />

      <Form.Checkbox
        id="enableSchedule"
        label="Schedule for later"
        info="Enable to send the email at a scheduled time instead of immediately"
        value={isScheduleEnabled}
        onChange={setIsScheduleEnabled}
      />
      {isScheduleEnabled && (
        <Form.DatePicker
          title="Schedule At"
          type={Form.DatePicker.Type.DateTime}
          info="The time to send the email (must be in the future)"
          {...itemProps.scheduledAt}
        />
      )}

      <Form.Separator />

      <Form.FilePicker
        title="Attachments (Optional)"
        allowMultipleSelection
        canChooseDirectories={false}
        info="Max 10 files, each up to 10 MB"
        {...itemProps.attachments}
      />
      <Form.TextField
        title="Tags (Optional)"
        placeholder="campaign:newsletter, user_id:12345"
        info="Comma-separated key:value pairs for tracking"
        {...itemProps.tags}
      />
    </Form>
  );
}
