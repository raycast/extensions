import { getPreferenceValues, Clipboard, showHUD, closeMainWindow } from "@raycast/api";

interface Preferences {
  bookingUrl?: string;
}

export default async function CopyBookingLinkCommand() {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.bookingUrl || preferences.bookingUrl.trim() === "") {
    await showHUD("❌ No booking URL configured. Please add it in extension preferences.");
    return;
  }

  await Clipboard.copy(preferences.bookingUrl);
  await closeMainWindow();
  await showHUD("✅ Booking link copied to clipboard!");
}
