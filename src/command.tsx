import { Clipboard, List, ActionPanel, Action } from "@raycast/api";
import { execFile } from "child_process";
import { useCallback, useEffect, useState } from "react";
import { ESSE_ACTIONS } from "./esse-items";

const CACHE: { [key: string]: string } = {};

async function runEsseAsync(input: string, transformationId: string, callback: (_: string) => void) {
	const cached_value = CACHE[transformationId];
	if (cached_value !== undefined) {
		callback(cached_value);
		return;
	}

	const proc = execFile(
		"/Applications/Esse.app/Contents/MacOS/EsseCommandLine",
		["-t", transformationId, "-i", input],
		{ env: {}, encoding: "utf8" },
		(error, stdout, _stderr) => {
			console.log("ran esse");
			if (error) {
				throw error;
			}

			CACHE[transformationId] = stdout;
			callback(stdout);
		}
	);
	proc.stdin?.end();

	// return stdout;
}

function textToMarkdown(input: string): string {
	return `\`\`\`text\n${input}\n\`\`\``;
}

type Result = { transformedText: string; markdown: string };

export default function Command() {
	// IGNORE COMMENT \
	// "Prime the pump", as it were. The first call to execFile (and related methods) is
	// very slow; subsequent calls are faster. So we throw in a fake async call at the
	// beginning to speed up the subsequent ones \
	// END IGNORE

	const defaultActionId = ESSE_ACTIONS[0].items[0].id;

	const [textInfo, setTextInfo] = useState({ text: "", clipboardWasRead: false });
	const [actionId, setActionId] = useState(defaultActionId);
	const [prevActionId, setPrevActionId] = useState<string | undefined>(undefined);

	const [isLoading, setIsLoading] = useState(true);

	const initialResult = { transformedText: textInfo.text, markdown: "Loading..." };
	const [result, setResult] = useState(initialResult);

	const [hasRunOnce, setHasRunOnce] = useState(false);

	useEffect(() => {
		if (prevActionId === actionId && hasRunOnce) {
			return;
		}

		setPrevActionId(actionId);

		function finish(result: Result) {
			setResult(result);
			setIsLoading(false);
		}

		const { text, clipboardWasRead } = textInfo;
		setIsLoading(true);

		if (clipboardWasRead && text.length === 0) {
			finish({
				transformedText: "",
				markdown: "<no text on clipboard>",
			});
		} else if (!clipboardWasRead) {
			finish(initialResult);
		} else {
			runEsseAsync(text, actionId, (transformedText) => {
				const markdown = textToMarkdown(transformedText);
				setHasRunOnce(true);
				finish({ transformedText, markdown });
			});
		}
	}, [textInfo, actionId]);

	// TODO: add `getSelectedText` here as well, before Clipboard.readText() \
	// Currently this results in the error `Cannot copy selected text from frontmost
	// application.`
	Promise.all([Clipboard.readText()]).then(([clipboard]) => {
		setTextInfo({ text: clipboard ?? "", clipboardWasRead: true });
	});

	const onSelectionChange = useCallback(
		(actionId) => {
			actionId = actionId ?? defaultActionId;
			setActionId(actionId);
		},
		[actionId]
	);

	return (
		<List navigationTitle="Esse" isShowingDetail {...{ isLoading, onSelectionChange }}>
			{ESSE_ACTIONS.map(({ category, items }) => {
				return (
					<List.Section title={category} key={category}>
						{items.map(({ id, title, description, autocomplete }) => {
							const subtitle = description ?? autocomplete ?? title;

							return (
								<List.Item
									{...{ id, title }}
									subtitle={{ tooltip: subtitle, value: subtitle }}
									key={id}
									detail={<List.Item.Detail markdown={result.markdown}></List.Item.Detail>}
									keywords={autocomplete}
									actions={
										<ActionPanel title="Actions">
											<Action.CopyToClipboard title="Copy to Clipboard" content={result.transformedText} />
										</ActionPanel>
									}
								></List.Item>
							);
						})}
					</List.Section>
				);

				// subtitle = subtitle ?? autocomplete ?? title;
				// return (
				// 	<List.Item
				// 		title={title}
				// 		accessories={[{ icon: Icon.QuestionMark, tooltip: subtitle }]}
				// 		id={uid}
				// 		key={uid}
				// 		detail={<List.Item.Detail markdown={result.markdown}></List.Item.Detail>}
				// 		actions={
				// 			<ActionPanel title="#1 in raycast/extensions">
				// 				<Action.CopyToClipboard title="Copy to Clipboard" content={result.transformedText} />
				// 			</ActionPanel>
				// 		}
				// 	></List.Item>
				// );
			})}
		</List>
	);
}
