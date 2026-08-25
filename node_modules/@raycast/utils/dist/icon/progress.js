"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProgressIcon = void 0;
const api_1 = require("@raycast/api");
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}
function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
    return d;
}
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
function getProgressIcon(progress, color = api_1.Color.Red, options) {
    const background = options?.background || (api_1.environment.appearance === "light" ? "black" : "white");
    const backgroundOpacity = options?.backgroundOpacity || 0.1;
    const stroke = 10;
    const padding = 5;
    const radius = 50 - padding - stroke / 2;
    const svg = `<svg width="100px" height="100px">
      <circle cx="50" cy="50" r="${radius}" stroke-width="${stroke}" stroke="${progress < 1 ? background : color}" opacity="${progress < 1 ? backgroundOpacity : "1"}" fill="none" />
      ${progress > 0 && progress < 1
        ? `<path d="${describeArc(50, 50, radius, 0, progress * 360)}" stroke="${color}" stroke-width="${stroke}" fill="none" />`
        : ""}
    </svg>
  `.replaceAll("\n", "");
    return `data:image/svg+xml,${svg}`;
}
exports.getProgressIcon = getProgressIcon;
