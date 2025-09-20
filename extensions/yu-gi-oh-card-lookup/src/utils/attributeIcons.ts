export const attributeIcons: { [key: string]: string } = {
  WIND: "wind.jpg",
  WATER: "water.jpg",
  LIGHT: "light.jpg",
  FIRE: "fire.jpg",
  EARTH: "earth.jpg",
  DIVINE: "divine.jpg",
  DARK: "dark.jpg",
};

export function getAttributeIcon(attribute: string): string {
  return attributeIcons[attribute] || "default-icon.png";
}
