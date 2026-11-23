import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'qrresto_client_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }
    const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}
