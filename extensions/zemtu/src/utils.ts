// Limit the image height in a markdown view (Raycast-specific query parameter)
export const withImageHeight = (url: string, height: number) =>
  `${url}${url.includes("?") ? "&" : "?"}raycast-height=${height}`;

// Apple Maps on macOS, Google Maps elsewhere (Windows has no Apple Maps)
export const mapsUrl = (location: { latitude: number; longitude: number } | string, label?: string) => {
  const isMac = process.platform === "darwin";
  if (typeof location === "string") {
    const query = encodeURIComponent(location);
    return isMac ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  const { latitude, longitude } = location;
  return isMac
    ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label ?? `${latitude},${longitude}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

// "ONBOARD_UNIT" -> "Onboard Unit", short acronyms like "GPS" stay as they are
export const formatCapability = (capability: string) =>
  capability
    .split("_")
    .map((word) => (word.length <= 3 ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");

// Great-circle distance in km between two coordinates
export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
