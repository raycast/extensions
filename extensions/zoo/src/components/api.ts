import OpenAI from "openai";

export const openai = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: "sk-a1aad8bd2a154c9792f7eb8aa46fc982",
});
// export const global_model = getPreferenceValues().model;
export const global_model = "deepseek-chat";
