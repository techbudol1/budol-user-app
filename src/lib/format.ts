export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string) {
  const date = parseDateValue(value);
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatNotificationTime(value?: string) {
  const date = parseDateValue(value);
  if (!date) {
    return "Not available";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 45_000) {
    return "Just now";
  }

  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
