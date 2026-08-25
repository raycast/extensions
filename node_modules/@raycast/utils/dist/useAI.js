"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAI = void 0;
const react_1 = require("react");
const api_1 = require("@raycast/api");
const usePromise_1 = require("./usePromise");
/**
 * Stream a prompt completion.
 *
 * @example
 * ```typescript
 * import { Detail, LaunchProps } from "@raycast/api";
 * import { use AI } from "@raycast/utils";
 *
 * export default function Command(props: LaunchProps<{ arguments: { prompt: string } }>) {
 *   const { isLoading, data } = useAI(props.arguments.prompt);
 *
 *   return <Detail isLoading={isLoading} markdown={data} />;
 * }
 * ```
 */
function useAI(prompt, options = {}) {
    const { creativity, stream, model, ...usePromiseOptions } = options;
    const [data, setData] = (0, react_1.useState)("");
    const abortable = (0, react_1.useRef)();
    const { isLoading, error, revalidate } = (0, usePromise_1.usePromise)(async (prompt, creativity, shouldStream) => {
        setData("");
        const stream = api_1.AI.ask(prompt, { creativity, model, signal: abortable.current?.signal });
        if (shouldStream === false) {
            setData(await stream);
        }
        else {
            stream.on("data", (data) => {
                setData((x) => x + data);
            });
            await stream;
        }
    }, [prompt, creativity, stream], { ...usePromiseOptions, abortable });
    return { isLoading, data, error, revalidate };
}
exports.useAI = useAI;
