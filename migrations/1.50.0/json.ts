import { API, FileInfo, Transform } from "jscodeshift";

const transform: Transform = (file: FileInfo, api: API) => {
  if (!file.path.includes("tsconfig.json")) {
    // Ignore files that don't match the file name pattern
    return null;
  }

  const tsconfig = JSON.parse(file.source);

  if (Array.isArray(tsconfig.include)) {
    tsconfig.include = tsconfig.include.concat(["raycast-env.d.ts"]);
  }

  return JSON.stringify(tsconfig, null, 2);
};

export default transform;
