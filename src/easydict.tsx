import { Fragment, useEffect, useState } from "react";
import {
  ActionFeedback,
  getListItemIcon,
  getWordAccessories,
  ListActionPanel,
} from "./components";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  LocalStorage,
} from "@raycast/api";
import {
  LanguageItem,
  TranslateSourceResult,
  TranslateDisplayResult,
  RequestResultState,
} from "./types";
import {
  BaiduRequestStateCode,
  getYoudaoErrorInfo,
  requestStateCodeLinkMap,
  TranslationType,
  YoudaoRequestStateCode,
} from "./consts";
import axios from "axios";
import {
  checkIsInstalledEudic,
  clipboardQueryInterval,
  defaultLanguage1,
  defaultLanguage2,
  getAutoSelectedTargetLanguageId,
  getInputTextLanguageId,
  getItemFromLanguageList,
  saveQueryClipboardRecord,
} from "./utils";
import { requestAllTranslateAPI } from "./request";
import {
  reformatTranslateDisplayResult,
  reformatTranslateResult,
} from "./dataFormat";

let requestResultState: RequestResultState;

let delayFetchTranslateAPITimer: NodeJS.Timeout;
let delayUpdateTargetLanguageTimer: NodeJS.Timeout;

export default function () {
  // use to display input text
  const [inputText, updateInputText] = useState<string>();
  // searchText = inputText.trim(), avoid frequent request API
  const [searchText, updateSearchText] = useState<string>();

  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [isInstalledEudic, updateIsInstalledEudic] = useState<boolean>(false);

  // Delay the time to call the query API. The API has frequency limit.
  const delayRequestTime = 600;

  if (defaultLanguage1.youdaoLanguageId === defaultLanguage2.youdaoLanguageId) {
    return (
      <List>
        <List.Item
          title={"Language Conflict"}
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
          subtitle={
            "Your first Language with second Language must be different."
          }
        />
      </List>
    );
  }

  const [translateDisplayResult, updateTranslateDisplayResult] =
    useState<TranslateDisplayResult[]>();

  /**
     the language type of text, depending on the language type of the current input text, it is preferred to judge whether it is English or Chinese according to the preferred language, and then auto
     */
  const [currentFromLanguageState, updateCurrentFromLanguageState] =
    useState<LanguageItem>();

  /*
    default translation language, based on user's preference language, can only defaultLanguage1 or defaultLanguage2 depending on the currentFromLanguageState. cannot be changed manually.
    */
  const [autoSelectedTargetLanguage, updateAutoSelectedTargetLanguage] =
    useState<LanguageItem>(defaultLanguage1);

  /*
    the user selected translation language, for display, can be changed manually. default userSelectedTargetLanguage is the autoSelectedTargetLanguage.
    */
  const [userSelectedTargetLanguage, updateUserSelectedTargetLanguage] =
    useState<LanguageItem>(autoSelectedTargetLanguage);

  function translate(fromLanguage: string, targetLanguage: string) {
    requestAllTranslateAPI(searchText!, fromLanguage, targetLanguage).then(
      axios.spread((youdaoRes: any, baiduRes: any, caiyunRes: any) => {
        // success return code: 0 undefined null
        const youdaoErrorCode = youdaoRes.data.errorCode;
        const baiduErrorCode = baiduRes.data.error_code;
        console.log("error code: ", youdaoErrorCode, baiduErrorCode);

        if (
          youdaoErrorCode ===
            YoudaoRequestStateCode.AccessFrequencyLimited.toString() ||
          baiduErrorCode ===
            BaiduRequestStateCode.AccessFrequencyLimited.toString()
        ) {
          delayUpdateTargetLanguageTimer = setTimeout(() => {
            console.log("--> error_code: ", baiduErrorCode);
            translate(fromLanguage, targetLanguage);
          }, delayRequestTime);
          return;
        }

        // handle exceptional errors, such as user AppID errors or exceptions of the API itself.
        requestResultState = {
          type: TranslationType.Youdao,
          errorInfo: getYoudaoErrorInfo(youdaoErrorCode),
        };
        if (youdaoErrorCode !== YoudaoRequestStateCode.Success.toString()) {
          console.log("youdaoRes: ", youdaoRes.data);

          displayRequestErrorInfo();
          return;
        }

        if (baiduErrorCode) {
          console.log("baiduRes: ", baiduRes.data);

          requestResultState = {
            type: TranslationType.Baidu,
            errorInfo: {
              errorCode: baiduErrorCode,
              errorMessage: baiduRes.data.error_msg,
            },
          };
          displayRequestErrorInfo();
          return;
        }

        let youdaoTranslateResult = youdaoRes.data;
        let baiduTranslateResult = baiduRes.data;
        let caiyunTranslateResult = undefined;

        console.log(`translate: ${fromLanguage} -> ${targetLanguage}`);
        console.log(
          "youdao result: ",
          JSON.stringify(youdaoTranslateResult, null, 4)
        );
        console.log(
          "baidu result: ",
          JSON.stringify(baiduTranslateResult, null, 4)
        );

        if (caiyunRes) {
          caiyunTranslateResult = caiyunRes.data;
          console.log(
            "caiyun result: ",
            JSON.stringify(caiyunRes.data, null, 4)
          );
        }

        const sourceResult: TranslateSourceResult = {
          youdaoResult: youdaoTranslateResult,
          baiduResult: baiduTranslateResult,
          caiyunResult: caiyunTranslateResult,
        };
        const reformatResult = reformatTranslateResult(sourceResult);

        const [from, to] = youdaoTranslateResult.l.split("2"); // from2to
        if (from === to) {
          const target = getAutoSelectedTargetLanguageId(from);
          updateAutoSelectedTargetLanguage(getItemFromLanguageList(target));
          translate(from, target);
          return;
        }

        updateLoadingState(false);
        updateTranslateDisplayResult(
          reformatTranslateDisplayResult(reformatResult)
        );
        updateCurrentFromLanguageState(getItemFromLanguageList(from));

        checkIsInstalledEudic(updateIsInstalledEudic);
      })
    );
  }

  // function: display error info when request API failed
  function displayRequestErrorInfo() {
    updateLoadingState(false);
    updateTranslateDisplayResult([]);
  }

  // function: query the clipboard text from LocalStorage
  async function queryClipboardText() {
    let text = await Clipboard.readText();
    console.log("query clipboard text: " + text);
    if (text) {
      const timestamp = (await LocalStorage.getItem<number>(text)) || 0;
      const now = new Date().getTime();
      console.log(`before: ${new Date(timestamp).toUTCString()}`);
      console.log(`now:    ${new Date(now).toUTCString()}`);
      if (!timestamp || now - timestamp > clipboardQueryInterval) {
        text = text.trim();
        saveQueryClipboardRecord(text);
        updateSearchText(text);
        updateInputText(text);
      }
    }
  }

  useEffect(() => {
    if (searchText) {
      updateLoadingState(true);
      clearTimeout(delayUpdateTargetLanguageTimer);

      const currentLanguageId = getInputTextLanguageId(searchText);
      console.log("currentLanguageId: ", currentLanguageId);
      updateCurrentFromLanguageState(
        getItemFromLanguageList(currentLanguageId)
      );

      // priority to use user selected target language
      let tartgetLanguageId = userSelectedTargetLanguage.youdaoLanguageId;
      console.log("userSelectedTargetLanguage: ", tartgetLanguageId);

      // if conflict, use auto selected target language
      if (currentLanguageId === tartgetLanguageId) {
        tartgetLanguageId = getAutoSelectedTargetLanguageId(currentLanguageId);
        console.log("autoSelectedTargetLanguage: ", tartgetLanguageId);
      }
      translate(currentLanguageId, tartgetLanguageId);

      return;
    }

    if (!searchText) {
      queryClipboardText();
    }
  }, [searchText]);

  function ListDetail() {
    if (!requestResultState) return null;

    const isYoudaoRequestError =
      requestResultState.type === TranslationType.Youdao &&
      requestResultState.errorInfo.errorCode !==
        YoudaoRequestStateCode.Success.toString();

    const isBaiduRequestError =
      requestResultState.type === TranslationType.Baidu &&
      requestResultState.errorInfo.errorCode !==
        BaiduRequestStateCode.Success.toString();

    let errorTitle = "Network Request Error:";
    if (isYoudaoRequestError) {
      errorTitle = "Youdao Request Error:";
    } else if (isBaiduRequestError) {
      errorTitle = "Baidu Request Error:";
    }

    if (isYoudaoRequestError || isBaiduRequestError) {
      return (
        <List.Item
          title={errorTitle}
          subtitle={`${requestResultState.errorInfo.errorMessage}`}
          accessories={[
            { text: `Error Code: ${requestResultState.errorInfo.errorCode}` },
          ]}
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="See Error Code Meaning"
                icon={Icon.QuestionMark}
                url={requestStateCodeLinkMap.get(requestResultState.type)!}
              />
              <ActionFeedback />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <Fragment>
        {translateDisplayResult?.map((resultItem, idx) => {
          return (
            <List.Section key={idx} title={resultItem.sectionTitle}>
              {resultItem.items?.map((item) => {
                return (
                  <List.Item
                    key={item.key}
                    icon={{
                      value: getListItemIcon(resultItem.type),
                      tooltip: item.tooltip || "",
                    }}
                    title={item.title}
                    subtitle={item.subtitle}
                    accessories={getWordAccessories(resultItem.type, item)}
                    actions={
                      <ListActionPanel
                        isInstalledEudic={isInstalledEudic}
                        queryText={searchText}
                        copyText={item.copyText}
                        currentFromLanguage={currentFromLanguageState}
                        currentTargetLanguage={autoSelectedTargetLanguage}
                        onLanguageUpdate={(value) => {
                          updateAutoSelectedTargetLanguage(value);
                          updateUserSelectedTargetLanguage(value);
                          translate(
                            currentFromLanguageState!.youdaoLanguageId,
                            value.youdaoLanguageId
                          );
                        }}
                      />
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
      </Fragment>
    );
  }

  function onInputChangeEvent(text: string) {
    updateInputText(text);

    const trimText = text.trim();
    if (trimText.length == 0) {
      updateLoadingState(false);
      updateTranslateDisplayResult([]);
      return;
    }

    clearTimeout(delayFetchTranslateAPITimer);

    // start delay timer for fetch translate API
    if (trimText.length > 0 && trimText !== searchText) {
      delayFetchTranslateAPITimer = setTimeout(() => {
        updateSearchText(trimText);
      }, delayRequestTime);
    }
  }

  return (
    <List
      isLoading={isLoadingState}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChangeEvent}
      actions={
        <ActionPanel>
          <ActionFeedback />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.TextDocument}
        title="Type a word to look up or translate"
      />
      <ListDetail />
    </List>
  );
}
