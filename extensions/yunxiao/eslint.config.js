import raycastConfig from "@raycast/eslint-config";

/**
 * 将 @raycast/eslint-config 的扁平数组归一化为单层（其内部的
 * typescript.configs.recommended 是嵌套数组，对 ESLint 10+ flat config 不合法）。
 */
function flatten(input) {
    const out = [];
    for (const item of input) {
        if (Array.isArray(item)) {
            for (const child of flatten(item)) out.push(child);
        } else if (item && typeof item === "object") {
            out.push(item);
        }
    }
    return out;
}

export default [
    {
        ignores: ["node_modules/**", ".omc/**", ".claude/**", ".idea/**", "dist/**"],
    },
    ...flatten(raycastConfig),
];
