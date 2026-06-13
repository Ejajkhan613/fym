import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from '../types/domain';

const SESSION_KEY = 'fym.auth.session';

export async function readStoredSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export async function writeStoredSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function removeStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
