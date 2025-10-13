import OpenAI from "openai";

// import preferences from package.json
import { getPreferenceValues } from "@raycast/api";

const endpoint = getPreferenceValues().baseurl || "https://api.openai.com/v1";
const apiKey = getPreferenceValues().apikey;

export const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: apiKey,
});

export const global_model = getPreferenceValues().custom_model || getPreferenceValues().model || "gpt-4o";
