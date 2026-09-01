import { Level } from "./level";
import { ChallengeLevel } from "./challengelevel";

export interface Stage {
  id: string;               
  modeId: string;           // The Mode this stage belongs to
  title: string;
  description: string;
  order: number;            // Linear order within the mode (not global)
  prerequisiteStageIds: string[]; 
  levels: Level[];
  challengeLevel: ChallengeLevel;
  passingStarThreshold: number; // Minimum stars across regular levels to unlock the challenge
}