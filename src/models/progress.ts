export interface StageProgress {
  playerId: string;
  stageId: string;
  unlocked: boolean;
  completed: boolean;           // true only when the challenge level has been passed
  challengeUnlocked: boolean;   // true when passingStarThreshold met across general levels
  challengePassed: boolean;     // true when player meets ChallengeLevel.passingAccuracy
  challengeAttempts: number;    // Total number of challenge attempts
  bestStars: number;            // Highest total stars across regular level attempts
  levelProgress: Record<string, LevelProgress>; // keyed by levelId
}

export interface LevelProgress {
  levelId: string;
  bestStars: number;
  bestAccuracy: number;     // 0–1
  playCount: number;
  lastPlayedAt: number;
}