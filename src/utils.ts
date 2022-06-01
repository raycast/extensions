import {
  getApplications,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { eudicBundleId } from "./components";
import { languageItemList } from "./consts";
import { LanguageItem, MyPreferences } from "./types";

// Time interval for automatic query of the same clipboard text, avoid frequently querying the same word. Default 10min
export const clipboardQueryInterval = 10 * 60 * 1000;

export const myPreferences: MyPreferences = getPreferenceValues();
export const defaultLanguage1 = getItemFromLanguageList(
  myPreferences.language1
);
export const defaultLanguage2 = getItemFromLanguageList(
  myPreferences.language2
);

export function truncate(string: string, length = 40, separator = "...") {
  if (string.length <= length) return string;
  return string.substring(0, length) + separator;
}

export function isPreferredChinese(): boolean {
  const lanuguageIdPrefix = "zh";
  const preferences: MyPreferences = getPreferenceValues();
  if (
    preferences.language1.startsWith(lanuguageIdPrefix) ||
    preferences.language2.startsWith(lanuguageIdPrefix)
  ) {
    return true;
  }
  return false;
}

export function getItemFromLanguageList(value: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoLanguageId === value) {
      return langItem;
    }
  }

  return {
    youdaoLanguageId: "",
    languageTitle: "",
    languageVoice: [""],
  };
}

// function: save last Clipboard text and timestamp
export function saveQueryClipboardRecord(text: string) {
  LocalStorage.setItem(text, new Date().getTime());
}

// function: remove all punctuation from the text
export function removeEnglishPunctuation(text: string) {
  return text.replace(
    /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g,
    ""
  );
}

// function: remove all Chinese punctuation and blank space from the text
export function removeChinesePunctuation(text: string) {
  return text.replace(
    /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g,
    ""
  );
}

// function: remove all punctuation from the text
export function removePunctuation(text: string) {
  return removeEnglishPunctuation(removeChinesePunctuation(text));
}

// function: remove all blank space from the text
export function removeBlankSpace(text: string) {
  return text.replace(/\s/g, "");
}

// function: check if the text contains Chinese characters
export function isContainChinese(text: string) {
  return /[\u4e00-\u9fa5]/g.test(text);
}

// function: check if text isEnglish or isNumber
export function isEnglishOrNumber(text: string) {
  const pureText = removePunctuation(removeBlankSpace(text));
  console.log("pureText: " + pureText);
  return /^[a-zA-Z0-9]+$/.test(pureText);
}

// function: get the language type represented by the string, priority to use English and Chinese, and then auto
export function getInputTextLanguageId(inputText: string): string {
  let fromLanguageId = "auto";
  const englishLanguageId = "en";
  const chineseLanguageId = "zh-CHS";
  if (
    isEnglishOrNumber(inputText) &&
    (defaultLanguage1.youdaoLanguageId === englishLanguageId ||
      defaultLanguage2.youdaoLanguageId === englishLanguageId)
  ) {
    fromLanguageId = englishLanguageId;
  } else if (
    isContainChinese(inputText) &&
    (defaultLanguage1.youdaoLanguageId === chineseLanguageId ||
      defaultLanguage2.youdaoLanguageId === chineseLanguageId)
  ) {
    fromLanguageId = chineseLanguageId;
  }

  console.log("fromLanguage-->:", fromLanguageId);
  return fromLanguageId;
}

// function: return and update the autoSelectedTargetLanguage according to the languageId
export function getAutoSelectedTargetLanguageId(
  accordingLanguageId: string
): string {
  let targetLanguageId = "auto";
  if (accordingLanguageId === defaultLanguage1.youdaoLanguageId) {
    targetLanguageId = defaultLanguage2.youdaoLanguageId;
  } else if (accordingLanguageId === defaultLanguage2.youdaoLanguageId) {
    targetLanguageId = defaultLanguage1.youdaoLanguageId;
  }

  const targetLanguage = getItemFromLanguageList(targetLanguageId);

  console.log(
    `languageId: ${accordingLanguageId}, auto selected target: ${targetLanguage.youdaoLanguageId}`
  );
  return targetLanguage.youdaoLanguageId;
}

async function traverseAllInstalledApplications(
  updateIsInstalledEudic: (isInstalled: boolean) => void
) {
  const installedApplications = await getApplications();
  LocalStorage.setItem(eudicBundleId, false);
  updateIsInstalledEudic(false);

  for (const application of installedApplications) {
    console.log(application.bundleId);
    if (application.bundleId === eudicBundleId) {
      updateIsInstalledEudic(true);
      LocalStorage.setItem(eudicBundleId, true);

      console.log("isInstalledEudic: true");
    }
  }
}

export function checkIsInstalledEudic(
  updateIsInstalledEudic: (isInstalled: boolean) => void
) {
  LocalStorage.getItem<boolean>(eudicBundleId).then((isInstalledEudic) => {
    console.log("is install: ", isInstalledEudic);

    if (isInstalledEudic == true) {
      updateIsInstalledEudic(true);
    } else if (isInstalledEudic == false) {
      updateIsInstalledEudic(false);
    } else {
      traverseAllInstalledApplications(updateIsInstalledEudic);
    }
  });
}
