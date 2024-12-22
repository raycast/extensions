import { Form, ActionPanel, Action, Clipboard, Icon } from "@raycast/api";
import { DateTime } from "effect";
import { formatInTimeZone } from "date-fns-tz";
import { useMemo, useState } from "react";

type Values = {
  time: Date;
};

const getShareData = (values: Values) => {
  const day = (time: Date) => `${time.getFullYear()}/${time.getMonth()}/${time.getDate()}`;
  const month = (time: Date) => `${time.getFullYear()}/${time.getMonth()}`;
  const year = (time: Date) => `${time.getFullYear()}`;

  const make = (time: Date) => ({
    day: day(time),
    month: month(time),
    year: year(time),
  });

  const today = DateTime.unsafeNow().pipe(DateTime.toDate, make);
  const tomorrow = DateTime.unsafeNow().pipe(DateTime.addDuration("1 day"), DateTime.toDate, make);
  const input = make(values.time);

  const show = {
    time: values.time.getHours() !== 0 || values.time.getMinutes() !== 0,
    minute: values.time.getMinutes() !== 0,
    day: input.day !== today.day,
    month: input.month !== today.month,
    year: input.year !== today.year,
  };

  const date = DateTime.unsafeMake(values.time.toISOString()).pipe(DateTime.toDate);

  let message = "";

  if (show.year) {
    message = formatInTimeZone(date, "UTC", "yyyy-MM-dd");
  } else if (show.month) {
    message = formatInTimeZone(date, "UTC", "MMM do");
  } else if (show.day) {
    if (input.day === tomorrow.day) {
      message = `tomorrow`;
    } else {
      message = formatInTimeZone(date, "UTC", "do");
    }
  }

  if (show.time) {
    if (message) {
      message += " at ";
    }

    let time = formatInTimeZone(date, "UTC", "h:mm").replace(/:00/, "");
    if (time.includes(":")) {
      time += ` `;
    }
    time += formatInTimeZone(date, "UTC", "aaa");
    message += time + " UTC";
  }

  const link = `https://zman.in/${encodeURIComponent(date.toISOString())}`;

  return { message, link };
};

export default function Command() {
  const [time, setTime] = useState<Date | null>(() => new Date());

  const preview = useMemo(() => {
    if (!time) return;
    const { link, message } = getShareData({ time });
    return { link, message };
  }, [time]);

  function handleSubmit(plaintextType: "text" | "markdown", values: Values) {
    const { link, message } = getShareData(values);
    const text = plaintextType === "text" ? message : `[${message}](${link})`;

    Clipboard.paste({
      html: `<a href="${link}">${message}</a>`,
      text,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm icon={Icon.Forward} title="Send Time" onSubmit={handleSubmit.bind(null, "text")} />
            <Action.SubmitForm
              icon={Icon.CodeBlock}
              title="Send Time (as Markdown)"
              onSubmit={handleSubmit.bind(null, "markdown")}
            />
            {preview && (
              <Action.CopyToClipboard
                shortcut={{ key: "c", modifiers: ["cmd"] }}
                title="Copy Link"
                content={preview.link}
              />
            )}
            {preview && (
              <Action.CopyToClipboard
                shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                content={`[${preview.message}](${preview.link})`}
                title="Copy as Markdown"
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Calendar}
              shortcut={{ key: "t", modifiers: ["cmd"] }}
              title="Set Time to Now"
              onAction={() => {
                setTime(new Date());
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Pick a time" onChange={(v) => setTime(v)} value={time} autoFocus id="time" />
      <Form.Description text={!preview ? "" : `${preview.message}`} />
    </Form>
  );
}
