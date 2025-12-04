import { API, FileInfo, Transform } from "jscodeshift";

const transform: Transform = (file: FileInfo, _api: API) => {
  if (!file.path.includes("tsconfig.json")) {
    // Ignore files that don't match the file name pattern
    return null;
  }

  const tsconfig = JSON.parse(file.source);
  delete tsconfig.display;

  if (
    "compilerOptions" in tsconfig &&
    typeof tsconfig.compilerOptions === "object"
  ) {
    tsconfig.compilerOptions.lib = ["ES2023"];
  }

  return JSON.stringify(tsconfig, null, 2);
};

export default transform;
