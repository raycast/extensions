import { getPreferenceValues } from "@raycast/api";

export interface LibreViewCredentials {
  username: string;
  password: string;
  unit: string;
  alertsEnabled: boolean;
  lowThreshold: string;
  highThreshold: string;
}

export function getLibreViewCredentials(): LibreViewCredentials {
  const prefs = getPreferenceValues<LibreViewCredentials>();
  const unit = prefs.unit;

  // Convert thresholds if needed
  let lowThreshold = prefs.lowThreshold;
  let highThreshold = prefs.highThreshold;

  // If unit is mgdl and thresholds look like mmol values, convert them
  if (unit === "mgdl" && parseFloat(lowThreshold) < 25) {
    lowThreshold = (parseFloat(lowThreshold) * 18).toFixed(0);
    highThreshold = (parseFloat(highThreshold) * 18).toFixed(0);
  }
  // If unit is mmol and thresholds look like mgdl values, convert them
  else if (unit === "mmol" && parseFloat(lowThreshold) > 25) {
    lowThreshold = (parseFloat(lowThreshold) / 18).toFixed(1);
    highThreshold = (parseFloat(highThreshold) / 18).toFixed(1);
  }

  return {
    ...prefs,
    lowThreshold,
    highThreshold,
  };
}
