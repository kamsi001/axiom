/**
 * Player settings — controls sound, music, display theme, and text size.
 */
export interface PlayerSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  textSize: 'small' | 'medium' | 'large';
}

/**
 * The local guest profile created on first launch.
 * All progress, settings, and cosmetics are scoped to this single profile.
 */
export interface Player {
  id: string;
  displayName: string;
  avatarId: string;
  createdAt: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: number;
  unlockedCosmetics: string[];
  settings: PlayerSettings;
}
