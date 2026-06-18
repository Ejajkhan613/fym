import { NativeModules, Platform } from 'react-native';

declare const process: {
  env: Record<string, string | undefined>;
};

const apiPort = process.env.EXPO_PUBLIC_API_PORT || '4000';
const orderSocketPort = process.env.EXPO_PUBLIC_ORDER_SOCKET_PORT || '4106';
const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const explicitOrderSocketUrl = process.env.EXPO_PUBLIC_ORDER_SOCKET_URL;
const apiTimeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 5000);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getDevServerBaseUrl(port: string) {
  const sourceCode = NativeModules.SourceCode as
    | { scriptURL?: string }
    | undefined;
  const scriptUrl = sourceCode?.scriptURL;
  const match = scriptUrl?.match(/^(https?):\/\/([^/:]+)/);
  return match ? `${match[1]}://${match[2]}:${port}` : undefined;
}

function getFallbackBaseUrl(port: string) {
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${port}`
    : `http://localhost:${port}`;
}

function unique(values: Array<string | undefined>) {
  return values.filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value) === index;
  });
}

const apiBaseUrls = unique([
  explicitApiBaseUrl,
  getDevServerBaseUrl(apiPort),
  getFallbackBaseUrl(apiPort),
  `http://localhost:${apiPort}`,
]).map(trimTrailingSlash);
const orderSocketUrls = unique([
  explicitOrderSocketUrl,
  getDevServerBaseUrl(orderSocketPort),
  getFallbackBaseUrl(orderSocketPort),
  `http://localhost:${orderSocketPort}`,
]).map(trimTrailingSlash);

export const env = {
  apiBaseUrls,
  orderSocketUrl: orderSocketUrls[0],
  orderSocketUrls,
  apiTimeoutMs,
};
