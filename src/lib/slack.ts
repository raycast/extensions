type PostMessageResponse = {
  ok: boolean;
  error?: string;
  channel?: string;
  ts?: string;
  warning?: string;
};

export type PostResult = { channel: string; ok: true; ts: string } | { channel: string; ok: false; error: string };

export async function postMessage(params: { token: string; channel: string; text: string }): Promise<PostResult> {
  const { token, channel, text } = params;
  let res: Response;
  try {
    res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    });
  } catch (e) {
    return {
      channel,
      ok: false,
      error: e instanceof Error ? e.message : "network error",
    };
  }

  if (!res.ok) {
    return { channel, ok: false, error: `HTTP ${res.status}` };
  }

  const data = (await res.json()) as PostMessageResponse;
  if (!data.ok) {
    return { channel, ok: false, error: data.error ?? "unknown error" };
  }
  return { channel, ok: true, ts: data.ts ?? "" };
}

export async function postMessageToAll(params: {
  token: string;
  channels: string[];
  text: string;
}): Promise<PostResult[]> {
  const { token, channels, text } = params;
  return Promise.all(channels.map((channel) => postMessage({ token, channel, text })));
}

export const escapeMrkdwn = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildSlackText(opts: { url: string; title: string; comment: string; template: string }): string {
  const { url, title, comment, template } = opts;
  const escapedTitle = escapeMrkdwn(title);
  const label = escapedTitle.replace(/\|/g, "/").trim() || url;
  const link = `<${url}|${label}>`;
  const trimmedComment = comment.trim();

  let result: string;
  if (trimmedComment === "") {
    result = template
      .split("\n")
      .filter((line) => line.trim() !== "{comment}")
      .join("\n");
  } else {
    result = template.replace(/\{comment\}/g, escapeMrkdwn(trimmedComment));
  }

  return result
    .replace(/\{title\}/g, escapedTitle)
    .replace(/\{url\}/g, url)
    .replace(/\{link\}/g, link);
}
