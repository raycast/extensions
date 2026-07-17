export function relativeAge(unixTime: number): string {
  const now = Date.now() / 1000;
  const diff = now - unixTime;

  if (diff < 0) return "in the future";
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

export function formatDate(unixTime: number): string {
  return new Date(unixTime * 1000).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
}
