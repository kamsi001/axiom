import type { QuestionType } from './generator';

// Tracked in session state (not persisted)
export interface SessionFeedbackState {
  missCountByType: Record<QuestionType, number>; // Running miss count per question type
  tier2TriggeredTypes: Set<QuestionType>; // Types that have already escalated to Tier 2
  introResurfaced: boolean; // Whether the level intro has been re-surfaced
}
