import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/src/constants/app';

export async function getToken(): Promise<string | undefined> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return v ?? undefined;
  } catch {
    return undefined;
  }
}

export async function setToken(token: string | undefined | null) {
  try {
    if (!token) await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    else await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch {}
}

export async function clearToken() {
  await setToken(undefined);
}

export const AuthStorage = { getToken, setToken, clearToken };
