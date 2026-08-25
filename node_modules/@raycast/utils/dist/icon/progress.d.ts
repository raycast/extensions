import { Color } from "@raycast/api";
import type { Image } from "@raycast/api";
/**
 * Icon to represent the progress of _something_.
 *
 * @param progress Number between 0 and 1.
 * @param color Hex color (default `"#FF6363"`) or Color.
 *
 * @returns an Image that can be used where Raycast expects them.
 *
 * @example
 * ```
 * <List.Item icon={getProgressIcon(0.1)} title="Project" />
 * ```
 */
export declare function getProgressIcon(progress: number, color?: Color | string, options?: {
    background?: Color | string;
    backgroundOpacity?: number;
}): Image.Asset;
//# sourceMappingURL=progress.d.ts.map