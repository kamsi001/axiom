import { QuestionType } from "./generator";

export interface Question {
  id: string;               // Session-scoped UUID
  levelId: string;
  type: QuestionType;
  prompt: string;        
  correctAnswer: string | number;
  answerChoices?: (string | number)[]; // Only for multiple-choice / tile-selection
  hint?: string;
  explanation: QuestionExplanation; // Shown after an incorrect answer (see Explanations section)
  difficulty: number;       // 1–10, assigned by generator
  metadata: Record<string, unknown>; // Type-specific rendering data (e.g., tile positions)
}

export interface QuestionExplanation {
  correctAnswerLabel: string;  
  steps?: string[];            // Optional step-by-step solution, e.g.
                               // ["Subtract 2 from both sides: 3x = 9", "Divide both sides by 3: x = 3"]
}