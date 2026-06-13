declare const process: {
  env: Record<string, string | undefined>;
};

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000',
};
