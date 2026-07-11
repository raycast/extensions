export const typeIcons: { [key: string]: string } = {
  "Quick-Play": "quick-play.png",
  Equip: "equip.png",
  Field: "field.png",
  Ritual: "ritual.png",
  Continuous: "continuous.png",
  Counter: "counter.png",
};

export function getTypeIcon(type: string): string {
  return typeIcons[type] || "";
}
