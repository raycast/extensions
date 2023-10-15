import { KnownBlock, WebClient } from "@slack/web-api";
import slackifyMarkdown from "slackify-markdown";
import { Update } from "./types";
import { getPreferenceValues, open } from "@raycast/api";

const preferences = getPreferenceValues();
const client = new WebClient(preferences.token);

function getBlocks(update: Update) {
  const blocks = new Array<KnownBlock>();

  if (update.yesterday) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: slackifyMarkdown(`# Yesterday\n${update.yesterday}`),
      },
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: slackifyMarkdown(`# Today\n${update.today}`),
    },
  });

  if (update.blockers) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: slackifyMarkdown(`# Blockers\n${update.blockers}`),
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "image",
        image_url: "https://www.raycast.com/favicon.png",
        alt_text: "raycast icon",
      },
      {
        type: "mrkdwn",
        text: "Created via Raycast",
      },
    ],
  });

  return blocks;
}

function getText(update: Update) {
  return slackifyMarkdown(`# Yesterday\n${update.yesterday}\n# Today\n${update.today}\n# Blockers\n${update.blockers}`);
}

export async function sendUpdate(update: Update) {
  const blocks = getBlocks(update);
  const text = getText(update);

  const response = await client.chat.postMessage({
    channel: preferences.channel,
    text,
    blocks,
    link_names: true,
    unfurl_links: false,
  });

  if (!response.ok) {
    throw Error(response.error ?? response.errors?.join());
  }

  return response.message;
}

export async function openChannel() {
  await open(`https://slack.com/app_redirect?channel=${preferences.channel}`);
}
