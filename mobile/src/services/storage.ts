import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'qrresto_staff_access_token';
const USER_KEY = 'qrresto_staff_user';

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return;
    } catch {
      // Fallback to AsyncStorage if SecureStore fails
    }
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
    } catch {
      // Fallback
    }
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Fallback
    }
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveStoredUser(user: unknown): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser<T>(): Promise<T | null> {
  const data = await AsyncStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function removeStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}
