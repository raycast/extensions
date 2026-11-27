// Zadig sends Unix seconds and uses 0 for a time that has not happened yet.
export const formatTime = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toLocaleString() : "-");
