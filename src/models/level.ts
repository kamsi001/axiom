import { GeneratorConfig } from './generator';

export interface Level {
  id: string;
  stageId: string;
  order: number; // Position within the stage
  title: string;
  introduction: LevelIntroduction | null;
  hintAllowance: number;
  questionCount: number;
  timeLimit: number | null; // Seconds; null means untimed
  generatorConfig: GeneratorConfig;
  starThresholds: StarThresholds;
}

export interface LevelIntroduction {
  body: string;
  examplePrompt?: string;
  exampleSolution?: string;
}

export interface StarThresholds {
  oneStar: number; // Minimum accuracy % for 1 star
  twoStar: number; // Minimum accuracy % for 2 stars
  threeStar: number; // Minimum accuracy % for 3 stars (speed bonus may apply)
}
