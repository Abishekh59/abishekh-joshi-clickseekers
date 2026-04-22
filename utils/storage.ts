import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@clickseekers_token";
const USER_KEY = "@clickseekers_user";
const FAVORITES_KEY = "@clickseekers_favorites";

export const storage = {
  // Stores login token persistently
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving token:", error);
      throw error;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error removing token:", error);
      throw error;
    }
  },

  // User data management
  async saveUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  },
  // Retrieves it later to stay logged in
  async getUser(): Promise<any | null> {
    try {
      const user = await AsyncStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error("Error removing user:", error);
      throw error;
    }
  },

  // Favorites management (local storage until backend is ready)
  async saveFavorites(favoriteIds: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    } catch (error) {
      console.error("Error saving favorites:", error);
      throw error;
    }
  },

  async getFavorites(): Promise<string[]> {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error("Error getting favorites:", error);
      return [];
    }
  },

  async addFavorite(userId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      if (!favorites.includes(userId)) {
        favorites.push(userId);
        await this.saveFavorites(favorites);
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
      throw error;
    }
  },

  async removeFavorite(userId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updated = favorites.filter((id) => id !== userId);
      await this.saveFavorites(updated);
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  },

  // Clear all auth data
  async clearAuth(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error("Error clearing auth:", error);
      throw error;
    }
  },
};
