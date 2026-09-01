import { GeneratorConfig } from "./generator";

export interface ChallengeLevel {
  id: string;      
  stageId: string;
  title: string;        
  questionCount: number;  
  timeLimit: number | null;
  passingAccuracy: number;  // 0–1 float; player must meet or exceed this to
  retryAllowed: boolean;  
  generatorConfigs: GeneratorConfig[]; // One config per question type covered in the stage;
                                       // generator samples across all of them
  difficultyWeights: {
    easy: number;    // proportion of questions at difficulty 1–4
    medium: number;  // proportion of questions at difficulty 5–7
    hard: number;    // proportion of questions at difficulty 8–10
                     // easy + medium + hard must sum to 1.0
  };
}