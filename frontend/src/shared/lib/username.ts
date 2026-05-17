/** Reserved nicknames that cannot be registered. */
const RESERVED = new Set([
  "admin",
  "moderator",
  "support",
  "blitz",
  "checkers",
  "player",
  "system",
  "help",
]);

/** Normalizes nickname for storage and search (lowercase, trimmed). */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** Returns true if value looks like an email address. */
export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Validates nickname format; returns error message or null if valid. */
export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);

  if (username.length < 3) {
    return "Никнейм минимум 3 символа";
  }
  if (username.length > 20) {
    return "Никнейм максимум 20 символов";
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Только латиница, цифры и _";
  }
  if (username.startsWith("player_")) {
    return "Выберите другой никнейм";
  }
  if (RESERVED.has(username)) {
    return "Этот никнейм занят системой";
  }

  return null;
}

/** Public profile path for a nickname. */
export function playerProfilePath(username: string): string {
  return `/player/${encodeURIComponent(normalizeUsername(username))}`;
}
