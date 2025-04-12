import { IterationSlim } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<IterationSlim[]> => shortcut.listIterations().then((response) => response.data);

export default tool;
