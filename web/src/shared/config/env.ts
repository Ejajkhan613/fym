function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const apiBaseUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
);

export const env = {
  apiBaseUrl,
  realtimeUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_REALTIME_URL || apiBaseUrl,
  ),
  realtimePath: process.env.NEXT_PUBLIC_REALTIME_PATH || "/socket.io",
  mapStyleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    "https://demotiles.maplibre.org/style.json",
} as const;
