// constants/warmup.ts
import { Color } from "@raycast/api";
import type { WarmupScheme } from "../types/warmup";

export const WARMUP_SCHEMES: WarmupScheme[] = [
  { percentage: 0.4, reps: 10, color: Color.Green }, // Light warmup
  { percentage: 0.5, reps: 8, color: Color.Yellow }, // Medium warmup
  { percentage: 0.6, reps: 5, color: Color.Orange }, // Moderate warmup
  { percentage: 0.8, reps: 3, color: Color.Red }, // Heavy warmup
  { percentage: 1.0, reps: 0, color: Color.Purple }, // Working set
];

export const WARMUP_DESCRIPTIONS = {
  light: "Light warmup to get blood flowing",
  medium: "Medium intensity to practice form",
  moderate: "Moderate load to prepare for working sets",
  heavy: "Heavy warmup to prime nervous system",
  working: "Working set weight",
};
