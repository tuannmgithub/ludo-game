import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIALS_KEY = 'credentials';
const USERNAME_KEY = 'username';

export interface Credentials {
  guestToken: string;
  playerId: string;
  username: string;
}

export const storage = {
  getCredentials: async (): Promise<Credentials | null> => {
    try {
      const data = await AsyncStorage.getItem(CREDENTIALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCredentials: async (data: Credentials): Promise<void> => {
    try {
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(data));
    } catch {
      // Silently fail
    }
  },

  clearCredentials: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CREDENTIALS_KEY);
    } catch {
      // Silently fail
    }
  },

  getUsername: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(USERNAME_KEY);
    } catch {
      return null;
    }
  },

  setUsername: async (username: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(USERNAME_KEY, username);
    } catch {
      // Silently fail
    }
  },
};
