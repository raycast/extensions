import type { Image } from "@raycast/api";
/**
 * Icon to represent an avatar when you don't have one. The generated avatar
 * will be generated from the initials of the name and have a colorful but consistent background.
 *
 * @returns an Image that can be used where Raycast expects them.
 *
 * @example
 * ```
 * <List.Item icon={getAvatarIcon('Mathieu Dutour')} title="Project" />
 * ```
 */
export declare function getAvatarIcon(name: string, options?: {
    /**
     * Custom background color
     */
    background?: string;
    /**
     * Whether to use a gradient for the background or not.
     * @default true
     */
    gradient?: boolean;
}): Image.Asset;
//# sourceMappingURL=avatar.d.ts.map