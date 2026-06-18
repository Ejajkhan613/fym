import { NativeModules, Platform } from 'react-native';

declare const process: {
  env: Record<string, string | undefined>;
};

const apiPort = process.env.EXPO_PUBLIC_API_PORT || '4000';
const orderSocketPort = process.env.EXPO_PUBLIC_ORDER_SOCKET_PORT || '4106';
const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const explicitOrderSocketUrl = process.env.EXPO_PUBLIC_ORDER_SOCKET_URL;
const apiTimeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 4000);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getDevServerBaseUrl(port: string) {
  const sourceCode = NativeModules.SourceCode as
    | { scriptURL?: string }
    | undefined;
  const scriptUrl = sourceCode?.scriptURL;
  const match = scriptUrl?.match(/^(https?):\/\/([^/:]+)/);

  if (!match) {
    return undefined;
  }

  return `${match[1]}://${match[2]}:${port}`;
}

function getFallbackBaseUrl(port: string) {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
}

function unique(values: Array<string | undefined>) {
  return values.filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value) === index;
  });
}

const devServerApiBaseUrl = getDevServerBaseUrl(apiPort);
const fallbackApiBaseUrl = getFallbackBaseUrl(apiPort);
const apiBaseUrlCandidates =
  Platform.OS === 'android'
    ? [
        devServerApiBaseUrl,
        explicitApiBaseUrl,
        fallbackApiBaseUrl,
        `http://localhost:${apiPort}`,
      ]
    : [explicitApiBaseUrl, devServerApiBaseUrl, fallbackApiBaseUrl];

const apiBaseUrls = unique(apiBaseUrlCandidates).map(trimTrailingSlash);
const devServerOrderSocketUrl = getDevServerBaseUrl(orderSocketPort);
const fallbackOrderSocketUrl = getFallbackBaseUrl(orderSocketPort);
const orderSocketUrlCandidates =
  Platform.OS === 'android'
    ? [
        devServerOrderSocketUrl,
        explicitOrderSocketUrl,
        fallbackOrderSocketUrl,
        `http://localhost:${orderSocketPort}`,
      ]
    : [explicitOrderSocketUrl, devServerOrderSocketUrl, fallbackOrderSocketUrl];
const orderSocketUrls = unique(orderSocketUrlCandidates).map(trimTrailingSlash);

export const env = {
  apiBaseUrl: apiBaseUrls[0],
  apiBaseUrls,
  orderSocketUrl: orderSocketUrls[0],
  orderSocketUrls,
  apiTimeoutMs,
};
