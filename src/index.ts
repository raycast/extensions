import { Arguments, Clipboard, getSelectedText, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

export default async function highlightBlock(props: LaunchProps<{ arguments: Arguments.MyCommand }>) {
  const { highlightStyle } = props.arguments;

  try {
    let insertInline = true;
    let selectedText = await getSelectedTextWithOptional();

    if (selectedText == undefined || selectedText.length === 0) {
      const clipboardText = await Clipboard.readText();
      if (clipboardText !== undefined && clipboardText.length > 0) {
        selectedText = clipboardText;
        insertInline = false;
      } else {
        throw Error("No text selection or clipboard content.");
      }
    }

    const transformedSelection = selectedText.replace(/\n/g, "\n> ");
    const concatenatedSelection = `> [!${highlightStyle}]\n> `.concat(transformedSelection);

    if (insertInline) {
      await Clipboard.paste(concatenatedSelection);
    } else {
      await Clipboard.copy(concatenatedSelection);
      await showHUD(`Copied ${highlightStyle.toLowerCase()} block to clipboard.`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot format selection as a GitHub highlight block",
      message: String(error),
    });
  }
}

async function getSelectedTextWithOptional(): Promise<String | undefined> {
  try {
    const text = await getSelectedText();
    return text;
  } catch (error) {
    return undefined;
  }
}

/*
> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.
*/
