import { Icon } from "@raycast/api";

export interface ViaChannelInfo {
  label: string;
  icon: Icon;
}

export const viaChannelMapping: Record<string, ViaChannelInfo> = {
  web: { label: "Web", icon: Icon.Globe },
  email: { label: "Email", icon: Icon.Envelope },
  api: { label: "API", icon: Icon.Code },
  rule: { label: "Rule", icon: Icon.Gear },
  twitter: { label: "Twitter", icon: Icon.Bird },
  forum: { label: "Forum", icon: Icon.SpeechBubble },
  chat: { label: "Chat", icon: Icon.SpeechBubble },
  voice: { label: "Voice", icon: Icon.Microphone },
  facebook: { label: "Facebook", icon: Icon.Globe },
  mobile_sdk: { label: "Mobile SDK", icon: Icon.Mobile },
  help_center: { label: "Help Center", icon: Icon.QuestionMarkCircle },
  sample_ticket: { label: "Sample Ticket", icon: Icon.Document },
  any_channel: { label: "Any Channel", icon: Icon.Globe },
  mobile: { label: "Mobile", icon: Icon.Mobile },
  sms: { label: "SMS", icon: Icon.Message },
  answer_bot_for_agents: { label: "Answer Bot for Agents", icon: Icon.ComputerChip },
  answer_bot_for_slack: { label: "Answer Bot for Slack", icon: Icon.Message },
  answer_bot_for_sdk: { label: "Answer Bot for SDK", icon: Icon.Code },
  answer_bot_api: { label: "Answer Bot API", icon: Icon.Code },
  answer_bot_for_web_widget: { label: "Answer Bot for Web Widget", icon: Icon.AppWindow },
  side_conversation: { label: "Side Conversation", icon: Icon.SpeechBubble },
  line: { label: "Line", icon: Icon.Message },
  wechat: { label: "WeChat", icon: Icon.Message },
  whatsapp: { label: "WhatsApp", icon: Icon.Message },
  native_messaging: { label: "Native Messaging", icon: Icon.Message },
  mailgun: { label: "Mailgun", icon: Icon.Envelope },
  messagebird_sms: { label: "MessageBird SMS", icon: Icon.Message },
  sunshine_conversations_facebook_messenger: { label: "Facebook Messenger", icon: Icon.Message },
  telegram: { label: "Telegram", icon: Icon.Message },
  twilio_sms: { label: "Twilio SMS", icon: Icon.Message },
  viber: { label: "Viber", icon: Icon.Message },
  google_rcs: { label: "Google RCS", icon: Icon.Message },
  apple_business_chat: { label: "Apple Business Chat", icon: Icon.Message },
  google_business_messages: { label: "Google Business Messages", icon: Icon.Message },
  kakaotalk: { label: "KakaoTalk", icon: Icon.Message },
  instagram_dm: { label: "Instagram DM", icon: Icon.Message },
  sunshine_conversations_api: { label: "Sunshine Conversations API", icon: Icon.Code },
  sunshine_conversations_twitter_dm: { label: "Sunshine Twitter DM", icon: Icon.Message },
  chat_transcript: { label: "Chat Transcript", icon: Icon.Document },
};

export function getViaChannelInfo(channel: string): ViaChannelInfo {
  return viaChannelMapping[channel] || { label: channel, icon: Icon.Circle };
}
