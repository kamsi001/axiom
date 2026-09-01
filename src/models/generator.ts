export interface GeneratorConfig {
  questionTypes: QuestionType[];  // Which interaction types are eligible
  operands: OperandConfig;
  allowNegatives: boolean;
  allowFractions: boolean;
  allowDecimals: boolean;
  variableCount: number | null;   // null = no variables (pure arithmetic)
  difficultyRange: [number, number]; // [min, max] on a 1–10 scale
}

export interface OperandConfig {
  min: number;
  max: number;
}

export type QuestionType =
  | "multiple-choice"
  | "numeric-input"
  | "drag-and-drop"
  | "tile-selection"
  | "equation-balance"
  | "fill-in-the-blank"
  | "order-operations";