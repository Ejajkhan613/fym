export function normalizePhoneForApi(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

export function maskPhone(value: string) {
  const normalized = normalizePhoneForApi(value);
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 2)} ${"*".repeat(Math.max(2, normalized.length - 6))} ${normalized.slice(-4)}`;
}
