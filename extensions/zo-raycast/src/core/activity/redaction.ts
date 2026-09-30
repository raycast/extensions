const SECRET_KEY_PATTERNS = ["key", "token", "secret", "password", "authorization", "cookie", "bearer"];

function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SECRET_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function redactSensitiveValues(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveValues(item));
  }

  if (typeof input === "object" && input !== null) {
    const record = input as Record<string, unknown>;
    const redactedEntries = Object.entries(record).map(([key, value]) => {
      if (isSecretKey(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, redactSensitiveValues(value)];
    });

    return Object.fromEntries(redactedEntries);
  }

  return input;
}
