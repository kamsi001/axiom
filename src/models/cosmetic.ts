export interface Cosmetic {
  id: string;
  type: 'avatar' | 'badge' | 'theme' | 'frame';
  name: string;
  description: string;
  unlockCondition: UnlockCondition;
  assetRef: string; // Path or key for the visual asset
}

export interface UnlockCondition {
  type: 'xp-threshold' | 'stage-complete' | 'streak' | 'perfect-level';
  value: number | string; // e.g., 500 for XP, stageId for stage-complete
}
