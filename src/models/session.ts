export interface SessionResult {
  id: string;
  playerId: string;
  levelId: string;
  stageId: string;
  modeId: string;
  completedAt: number;
  durationSeconds: number;
  questionsTotal: number;
  questionsCorrect: number;
  accuracy: number; // 0–1 float
  starsEarned: 0 | 1 | 2 | 3;
  xpEarned: number;
  hintsUsed: number; // Total hints consumed in the session
  answers: AnswerRecord[];
}

export interface AnswerRecord {
  questionId: string;
  submittedAnswer: string | number;
  correct: boolean;
  timeSpentSeconds: number;
  hintUsed: boolean; // Whether the hint was revealed before answering
  feedbackTierShown: 1 | 2 | 3 | null; // Feedback tier shown after answer; null = correct
}
