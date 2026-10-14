import { api, getDemoMode } from './client';

export type AppearancePreferences = { theme: string; paused: boolean };

export const appearanceApi = {
  get: (userId: string): Promise<AppearancePreferences> => {
    if (getDemoMode()) {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(`khwwc.appearance.${userId}`) || '{"theme":"sky","paused":false}')); }
      catch { return Promise.resolve({ theme: 'sky', paused: false }); }
    }
    return api.get<AppearancePreferences>('/auth/appearance');
  },
  save: async (userId: string, preferences: AppearancePreferences): Promise<AppearancePreferences> => {
    if (getDemoMode()) {
      localStorage.setItem(`khwwc.appearance.${userId}`, JSON.stringify(preferences));
      return preferences;
    }
    return api.put<AppearancePreferences>('/auth/appearance', preferences);
  },
};