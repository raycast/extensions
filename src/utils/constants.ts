import { Color } from "@raycast/api";

export const TILE_COLORS_BY_INDEX = [
  // mapping Farrago's `colorIndex` (0-8) to Raycast's `Color`s
  Color.Purple,
  Color.Magenta,
  Color.Red,
  Color.Orange,
  Color.Yellow,
  Color.Green,
  Color.PrimaryText, // teal not available
  Color.Blue,
  Color.PrimaryText,
];

// Farrago's default fade duration is 2 seconds
// https://rogueamoeba.com/support/manuals/farrago/?page=inspector#:~:text=The%20Fade%20Out%20button%20will%20fade%20out%20playback%20over%202%20seconds.
export const FARRAGO_FADE_DURATION_MS = 2000;
