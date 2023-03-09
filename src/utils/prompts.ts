import { ChatCompletionRequestMessage } from 'openai';
import { LANGUAGES } from './languages';

const CHINESE_LANGUAGES = ['zh', 'zh-CN', 'zh-TW', 'zh-Hans', 'zh-Hant', 'wyw', 'yue'];

export const SYS_PROMPT: ChatCompletionRequestMessage = {
  role: 'system',
  content: 'You are a translator that can only translate text, nothing else',
};

const buildUserPrompt = (text: string, from: string, to: string): ChatCompletionRequestMessage => {
  // const isFromChinese = CHINESE_LANGUAGES.includes(from);
  // const isToChinese = CHINESE_LANGUAGES.includes(to);

  // This could throw a runtime error, however we are passing `from` and `to` explicitly from the keys of `LANGUAGES`
  // which eliminated the issue.
  const fromLang = LANGUAGES[from];
  const toLang = LANGUAGES[to];

  const translatePrompt = from === 'auto' ? `Translate to ${toLang}` : `Translate from ${fromLang} to ${toLang}`;

  return {
    role: 'user',
    content: `${translatePrompt}:\n\n${text}`,
  };
};

export default buildUserPrompt;
