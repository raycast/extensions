export function formatDuration(
  seconds: number,
  options: { showZeroHours?: boolean; hideZeroMinutes?: boolean; padHours?: boolean; padMinutes?: boolean } = {},
): string {
  const { showZeroHours = true, hideZeroMinutes = false, padHours = true, padMinutes = true } = options;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  const formattedHours = padHours ? hours.toString().padStart(2, "0") : hours.toString();
  const formattedMinutes = padMinutes ? minutes.toString().padStart(2, "0") : minutes.toString();

  if (!showZeroHours && hours === 0) {
    return `${formattedMinutes}m`;
  }

  if (hideZeroMinutes && minutes === 0 && hours > 0) {
    return `${formattedHours}h`;
  }

  return `${formattedHours}h ${formattedMinutes}m`;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
