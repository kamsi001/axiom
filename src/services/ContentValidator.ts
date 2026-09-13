/**
 * ContentValidator.ts
 *
 * Validates a ContentBundle (parsed from content.json) before any game
 * content is rendered or used.  Accepts `unknown` input so it works directly
 * on the result of JSON.parse().
 *
 * Validation rules:
 *  1. All required fields present on every model
 *  2. Stage.modeId references an existing Mode
 *  3. Stage.prerequisiteStageIds reference stages within the same mode only
 *  4. No circular prerequisite chains
 *  5. No duplicate Level.order values within a stage
 *  6. ChallengeLevel.passingAccuracy is in [0, 1]
 *  7. ChallengeLevel.difficultyWeights.easy + medium + hard === 1.0 (±0.001)
 *  8. GeneratorConfig.difficultyRange[0] <= difficultyRange[1]
 *  9. ChallengeLevel.generatorConfigs cover all QuestionTypes used in stage levels
 * 10. Descriptive error messages (field path, expected type, received value)
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ValidationError {
  /** JSON-path-style location, e.g. "stages[2].levels[1].generatorConfig.difficultyRange" */
  path: string;
  /** The leaf field name, e.g. "difficultyRange" */
  field: string;
  /** Human-readable description of the problem */
  message: string;
  /** What the field should be, e.g. "number between 0 and 1" */
  expected: string;
  /** What was actually received, e.g. "1.5" */
  received: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a ContentBundle parsed from JSON.
 * Collects ALL errors before returning — callers get a complete picture.
 */
export function validateContentBundle(bundle: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  validateBundle(bundle, errors);
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

function isObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function repr(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'object') return Array.isArray(v) ? 'array' : 'object';
  return String(v);
}

// ---------------------------------------------------------------------------
// Error factory
// ---------------------------------------------------------------------------

function err(
  errors: ValidationError[],
  path: string,
  field: string,
  message: string,
  expected: string,
  received: unknown,
): void {
  errors.push({ path, field, message, expected, received: repr(received) });
}

// ---------------------------------------------------------------------------
// Field-presence checkers
// ---------------------------------------------------------------------------

function fieldPath(path: string, field: string): string {
  return path ? `${path}.${field}` : field;
}

function requireString(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isNonEmptyString(v)) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a non-empty string`,
      'non-empty string',
      v,
    );
    return false;
  }
  return true;
}

function requirePositiveInteger(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isInteger(v) || (v as number) < 1) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a positive integer (>= 1)`,
      'integer >= 1',
      v,
    );
    return false;
  }
  return true;
}

function requireNonNegativeInteger(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isInteger(v) || (v as number) < 0) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a non-negative integer (>= 0)`,
      'integer >= 0',
      v,
    );
    return false;
  }
  return true;
}

function requireBoolean(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isBoolean(v)) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a boolean`,
      'boolean',
      v,
    );
    return false;
  }
  return true;
}

function requireNumber(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isNumber(v)) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a finite number`,
      'number',
      v,
    );
    return false;
  }
  return true;
}

function requireNonEmptyArray(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isArray(v) || v.length === 0) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be a non-empty array`,
      'non-empty array',
      v,
    );
    return false;
  }
  return true;
}

function requireArray(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isArray(v)) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be an array`,
      'array',
      v,
    );
    return false;
  }
  return true;
}

function requireObject(
  errors: ValidationError[],
  obj: Obj,
  field: string,
  path: string,
): boolean {
  const v = obj[field];
  if (!isObject(v)) {
    err(
      errors,
      fieldPath(path, field),
      field,
      `"${field}" must be an object`,
      'object',
      v,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// VALID QuestionTypes constant
// ---------------------------------------------------------------------------

const VALID_QUESTION_TYPES = new Set<string>([
  'multiple-choice',
  'numeric-input',
  'drag-and-drop',
  'tile-selection',
  'equation-balance',
  'fill-in-the-blank',
  'order-operations',
]);

// ---------------------------------------------------------------------------
// GeneratorConfig validator
// ---------------------------------------------------------------------------

function validateGeneratorConfig(
  config: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(config)) {
    err(errors, path, path.split('.').pop() ?? path, 'GeneratorConfig must be an object', 'object', config);
    return;
  }

  // Required fields
  requireBoolean(errors, config, 'allowNegatives', path);
  requireBoolean(errors, config, 'allowFractions', path);
  requireBoolean(errors, config, 'allowDecimals', path);

  // operands object
  if (requireObject(errors, config, 'operands', path)) {
    const operands = config.operands as Obj;
    requireNumber(errors, operands, 'min', `${path}.operands`);
    requireNumber(errors, operands, 'max', `${path}.operands`);
  }

  // variableCount: null or integer >= 0
  const vc = config.variableCount;
  if (vc !== null) {
    if (!isInteger(vc) || (vc as number) < 0) {
      err(
        errors,
        `${path}.variableCount`,
        'variableCount',
        '"variableCount" must be a non-negative integer or null',
        'integer >= 0 or null',
        vc,
      );
    }
  }

  // questionTypes: non-empty array of valid types
  if (requireNonEmptyArray(errors, config, 'questionTypes', path)) {
    const qt = config.questionTypes as unknown[];
    qt.forEach((type, i) => {
      if (typeof type !== 'string' || !VALID_QUESTION_TYPES.has(type)) {
        err(
          errors,
          `${path}.questionTypes[${i}]`,
          'questionTypes',
          `Unknown question type at index ${i}`,
          `one of: ${[...VALID_QUESTION_TYPES].join(', ')}`,
          type,
        );
      }
    });
  }

  // difficultyRange: [min, max] where min <= max
  const dr = config.difficultyRange;
  if (!isArray(dr) || dr.length !== 2) {
    err(
      errors,
      `${path}.difficultyRange`,
      'difficultyRange',
      '"difficultyRange" must be an array of exactly 2 integers',
      'array of 2 integers [min, max]',
      dr,
    );
  } else {
    const [dMin, dMax] = dr as unknown[];
    if (!isInteger(dMin) || (dMin as number) < 1 || (dMin as number) > 10) {
      err(
        errors,
        `${path}.difficultyRange[0]`,
        'difficultyRange',
        '"difficultyRange[0]" must be an integer between 1 and 10',
        'integer 1–10',
        dMin,
      );
    }
    if (!isInteger(dMax) || (dMax as number) < 1 || (dMax as number) > 10) {
      err(
        errors,
        `${path}.difficultyRange[1]`,
        'difficultyRange',
        '"difficultyRange[1]" must be an integer between 1 and 10',
        'integer 1–10',
        dMax,
      );
    }
    // sub-task 8: min <= max
    if (isInteger(dMin) && isInteger(dMax) && (dMin as number) > (dMax as number)) {
      err(
        errors,
        `${path}.difficultyRange`,
        'difficultyRange',
        `"difficultyRange[0]" (${dMin}) must be <= "difficultyRange[1]" (${dMax})`,
        'difficultyRange[0] <= difficultyRange[1]',
        `[${dMin}, ${dMax}]`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// StarThresholds validator (sub-task 1)
// ---------------------------------------------------------------------------

function validateStarThresholds(
  thresholds: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(thresholds)) {
    err(errors, path, 'starThresholds', 'starThresholds must be an object', 'object', thresholds);
    return;
  }
  for (const field of ['oneStar', 'twoStar', 'threeStar'] as const) {
    const v = thresholds[field];
    if (!isNumber(v) || (v as number) < 0 || (v as number) > 100) {
      err(
        errors,
        `${path}.${field}`,
        field,
        `"${field}" must be a number between 0 and 100`,
        'number 0–100',
        v,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// LevelIntroduction validator (sub-task 1)
// ---------------------------------------------------------------------------

function validateLevelIntroduction(
  intro: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(intro)) {
    err(errors, path, 'introduction', 'introduction must be an object or null', 'object or null', intro);
    return;
  }
  requireString(errors, intro, 'body', path);
  // examplePrompt and exampleSolution are optional — but if present, must be strings
  if ('examplePrompt' in intro && intro.examplePrompt !== undefined) {
    if (!isNonEmptyString(intro.examplePrompt)) {
      err(
        errors,
        `${path}.examplePrompt`,
        'examplePrompt',
        '"examplePrompt" must be a non-empty string when provided',
        'non-empty string',
        intro.examplePrompt,
      );
    }
  }
  if ('exampleSolution' in intro && intro.exampleSolution !== undefined) {
    if (!isNonEmptyString(intro.exampleSolution)) {
      err(
        errors,
        `${path}.exampleSolution`,
        'exampleSolution',
        '"exampleSolution" must be a non-empty string when provided',
        'non-empty string',
        intro.exampleSolution,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Level validator (sub-tasks 1, 8)
// ---------------------------------------------------------------------------

function validateLevel(
  level: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(level)) {
    err(errors, path, path.split('.').pop() ?? path, 'Level must be an object', 'object', level);
    return;
  }

  requireString(errors, level, 'id', path);
  requireString(errors, level, 'stageId', path);
  requirePositiveInteger(errors, level, 'order', path);
  requireString(errors, level, 'title', path);
  requireNonNegativeInteger(errors, level, 'hintAllowance', path);
  requirePositiveInteger(errors, level, 'questionCount', path);

  // timeLimit: null or positive integer
  const tl = level.timeLimit;
  if (tl !== null) {
    if (!isInteger(tl) || (tl as number) < 1) {
      err(
        errors,
        `${path}.timeLimit`,
        'timeLimit',
        '"timeLimit" must be a positive integer (seconds) or null',
        'integer >= 1 or null',
        tl,
      );
    }
  }

  // introduction: null or object
  const intro = level.introduction;
  if (intro !== null) {
    if (isObject(intro)) {
      validateLevelIntroduction(intro, `${path}.introduction`, errors);
    } else {
      err(
        errors,
        `${path}.introduction`,
        'introduction',
        '"introduction" must be an object or null',
        'object or null',
        intro,
      );
    }
  }

  // generatorConfig
  if (requireObject(errors, level, 'generatorConfig', path)) {
    validateGeneratorConfig(level.generatorConfig, `${path}.generatorConfig`, errors);
  }

  // starThresholds
  if (requireObject(errors, level, 'starThresholds', path)) {
    validateStarThresholds(level.starThresholds, `${path}.starThresholds`, errors);
  }
}

// ---------------------------------------------------------------------------
// ChallengeLevel validator
// ---------------------------------------------------------------------------

function validateChallengeLevel(
  cl: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(cl)) {
    err(errors, path, 'challengeLevel', 'challengeLevel must be an object', 'object', cl);
    return;
  }

  requireString(errors, cl, 'id', path);
  requireString(errors, cl, 'stageId', path);
  requireString(errors, cl, 'title', path);
  requirePositiveInteger(errors, cl, 'questionCount', path);
  requireBoolean(errors, cl, 'retryAllowed', path);

  // timeLimit: null or positive integer
  const tl = cl.timeLimit;
  if (tl !== null) {
    if (!isInteger(tl) || (tl as number) < 1) {
      err(
        errors,
        `${path}.timeLimit`,
        'timeLimit',
        '"timeLimit" must be a positive integer (seconds) or null',
        'integer >= 1 or null',
        tl,
      );
    }
  }

  // sub-task 6: passingAccuracy in [0, 1]
  const pa = cl.passingAccuracy;
  if (!isNumber(pa)) {
    err(
      errors,
      `${path}.passingAccuracy`,
      'passingAccuracy',
      '"passingAccuracy" must be a number',
      'number between 0 and 1',
      pa,
    );
  } else if ((pa as number) < 0 || (pa as number) > 1) {
    err(
      errors,
      `${path}.passingAccuracy`,
      'passingAccuracy',
      `"passingAccuracy" must be between 0 and 1, received ${pa}`,
      'number between 0 and 1',
      pa,
    );
  }

  // sub-task 7: difficultyWeights sum to 1.0 (±0.001)
  if (requireObject(errors, cl, 'difficultyWeights', path)) {
    const dw = cl.difficultyWeights as Obj;
    const weightValid = ['easy', 'medium', 'hard'].every((k) => {
      const v = dw[k];
      if (!isNumber(v) || (v as number) < 0 || (v as number) > 1) {
        err(
          errors,
          `${path}.difficultyWeights.${k}`,
          k,
          `difficultyWeights.${k} must be a number between 0 and 1`,
          'number 0–1',
          v,
        );
        return false;
      }
      return true;
    });

    if (weightValid) {
      const sum =
        (dw.easy as number) + (dw.medium as number) + (dw.hard as number);
      if (Math.abs(sum - 1.0) > 0.001) {
        err(
          errors,
          `${path}.difficultyWeights`,
          'difficultyWeights',
          `difficultyWeights.easy + medium + hard must equal 1.0 (±0.001), got ${sum.toFixed(4)}`,
          'easy + medium + hard === 1.0 (±0.001)',
          `{ easy: ${dw.easy}, medium: ${dw.medium}, hard: ${dw.hard} } (sum: ${sum.toFixed(4)})`,
        );
      }
    }
  }

  // generatorConfigs: non-empty array of GeneratorConfig (sub-task 1)
  if (requireNonEmptyArray(errors, cl, 'generatorConfigs', path)) {
    const configs = cl.generatorConfigs as unknown[];
    configs.forEach((cfg, i) => {
      validateGeneratorConfig(cfg, `${path}.generatorConfigs[${i}]`, errors);
    });
  }
}

// ---------------------------------------------------------------------------
// Stage validator
// ---------------------------------------------------------------------------

function validateStage(
  stage: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(stage)) {
    err(errors, path, path.split('.').pop() ?? path, 'Stage must be an object', 'object', stage);
    return;
  }

  requireString(errors, stage, 'id', path);
  requireString(errors, stage, 'modeId', path);
  requireString(errors, stage, 'title', path);
  requireString(errors, stage, 'description', path);
  requirePositiveInteger(errors, stage, 'order', path);
  requireNonNegativeInteger(errors, stage, 'passingStarThreshold', path);

  // prerequisiteStageIds: must be an array (can be empty)
  requireArray(errors, stage, 'prerequisiteStageIds', path);

  // levels: non-empty arraya
  if (requireNonEmptyArray(errors, stage, 'levels', path)) {
    const levels = stage.levels as unknown[];

    // detect duplicate order values within the stage
    const seenOrders = new Map<number, number>(); // order → first index
    levels.forEach((level, i) => {
      validateLevel(level, `${path}.levels[${i}]`, errors);
      if (isObject(level) && isInteger(level.order)) {
        const ord = level.order as number;
        if (seenOrders.has(ord)) {
          err(
            errors,
            `${path}.levels[${i}].order`,
            'order',
            `Duplicate level order ${ord} in stage — also used at levels[${seenOrders.get(ord)}]`,
            'unique integer within the stage',
            ord,
          );
        } else {
          seenOrders.set(ord, i);
        }
      }
    });
  }

  // challengeLevel (sub-tasks 1, 6, 7, 8)
  if (requireObject(errors, stage, 'challengeLevel', path)) {
    validateChallengeLevel(stage.challengeLevel, `${path}.challengeLevel`, errors);
  }
}

// ---------------------------------------------------------------------------
// Mode validator (sub-task 1)
// ---------------------------------------------------------------------------

function validateMode(
  mode: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(mode)) {
    err(errors, path, path.split('.').pop() ?? path, 'Mode must be an object', 'object', mode);
    return;
  }
  requireString(errors, mode, 'id', path);
  requireString(errors, mode, 'title', path);
  requireString(errors, mode, 'description', path);
  requirePositiveInteger(errors, mode, 'order', path);
  requireArray(errors, mode, 'stageIds', path);
}

// ---------------------------------------------------------------------------
// Cosmetic validator (sub-task 1)
// ---------------------------------------------------------------------------

const VALID_COSMETIC_TYPES = new Set(['avatar', 'badge', 'theme', 'frame']);
const VALID_UNLOCK_TYPES = new Set([
  'xp-threshold',
  'stage-complete',
  'streak',
  'perfect-level',
]);

function validateCosmetic(
  cosmetic: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isObject(cosmetic)) {
    err(errors, path, path.split('.').pop() ?? path, 'Cosmetic must be an object', 'object', cosmetic);
    return;
  }
  requireString(errors, cosmetic, 'id', path);
  requireString(errors, cosmetic, 'name', path);
  requireString(errors, cosmetic, 'description', path);
  requireString(errors, cosmetic, 'assetRef', path);

  const type = cosmetic.type;
  if (!isNonEmptyString(type) || !VALID_COSMETIC_TYPES.has(type)) {
    err(
      errors,
      `${path}.type`,
      'type',
      `"type" must be one of: ${[...VALID_COSMETIC_TYPES].join(', ')}`,
      [...VALID_COSMETIC_TYPES].join(' | '),
      type,
    );
  }

  if (requireObject(errors, cosmetic, 'unlockCondition', path)) {
    const uc = cosmetic.unlockCondition as Obj;
    const ucType = uc.type;
    if (!isNonEmptyString(ucType) || !VALID_UNLOCK_TYPES.has(ucType)) {
      err(
        errors,
        `${path}.unlockCondition.type`,
        'type',
        `unlockCondition.type must be one of: ${[...VALID_UNLOCK_TYPES].join(', ')}`,
        [...VALID_UNLOCK_TYPES].join(' | '),
        ucType,
      );
    }
    const ucValue = uc.value;
    if (
      !(typeof ucValue === 'number' && ucValue >= 0) &&
      !isNonEmptyString(ucValue)
    ) {
      err(
        errors,
        `${path}.unlockCondition.value`,
        'value',
        '"value" must be a non-negative number or a non-empty string',
        'number >= 0 or non-empty string',
        ucValue,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-field validators
// ---------------------------------------------------------------------------

/** Stage.modeId references an existing Mode */
function checkModeIdReferences(
  stages: Obj[],
  modeIds: Set<string>,
  errors: ValidationError[],
): void {
  stages.forEach((stage, i) => {
    const modeId = stage.modeId;
    if (isNonEmptyString(modeId) && !modeIds.has(modeId)) {
      err(
        errors,
        `stages[${i}].modeId`,
        'modeId',
        `"modeId" "${modeId}" does not reference any defined mode`,
        `one of: ${[...modeIds].join(', ')}`,
        modeId,
      );
    }
  });
}

/** prerequisiteStageIds reference stages within the same mode only */
function checkPrerequisiteReferences(
  stages: Obj[],
  stageById: Map<string, Obj>,
  errors: ValidationError[],
): void {
  stages.forEach((stage, i) => {
    if (!isArray(stage.prerequisiteStageIds)) return;
    const prereqs = stage.prerequisiteStageIds as unknown[];
    prereqs.forEach((prereqId, j) => {
      if (!isNonEmptyString(prereqId)) return; // already caught by field validation

      if (!stageById.has(prereqId)) {
        // Non-existent stage
        err(
          errors,
          `stages[${i}].prerequisiteStageIds[${j}]`,
          'prerequisiteStageIds',
          `Prerequisite stage "${prereqId}" is not defined in the content bundle`,
          'valid stage id',
          prereqId,
        );
        return;
      }

      // Cross-mode check
      const prereqStage = stageById.get(prereqId) as Obj;
      if (
        isNonEmptyString(stage.modeId) &&
        isNonEmptyString(prereqStage.modeId) &&
        stage.modeId !== prereqStage.modeId
      ) {
        err(
          errors,
          `stages[${i}].prerequisiteStageIds[${j}]`,
          'prerequisiteStageIds',
          `Prerequisite "${prereqId}" belongs to mode "${prereqStage.modeId}" but stage "${stage.id}" belongs to mode "${stage.modeId}". Cross-mode prerequisites are not allowed.`,
          'stage within the same mode',
          prereqId,
        );
      }
    });
  });
}

/** detect circular prerequisite chains using iterative DFS */
function checkCircularPrerequisites(
  stages: Obj[],
  errors: ValidationError[],
): void {
  // Build adjacency list id → Set<id>
  const adj = new Map<string, Set<string>>();
  for (const stage of stages) {
    if (!isNonEmptyString(stage.id)) continue;
    const prereqs = isArray(stage.prerequisiteStageIds)
      ? (stage.prerequisiteStageIds as unknown[]).filter(isNonEmptyString)
      : [];
    adj.set(stage.id as string, new Set(prereqs as string[]));
  }

  // Kahn's algorithm – if topo sort doesn't consume all nodes, there is a cycle
  const inDegree = new Map<string, number>();
  for (const id of adj.keys()) {
    if (!inDegree.has(id)) inDegree.set(id, 0);
  }
  for (const [, neighbours] of adj) {
    for (const nb of neighbours) {
      inDegree.set(nb, (inDegree.get(nb) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visited++;
    for (const nb of (adj.get(node) ?? [])) {
      const newDeg = (inDegree.get(nb) ?? 1) - 1;
      inDegree.set(nb, newDeg);
      if (newDeg === 0) queue.push(nb);
    }
  }

  if (visited < adj.size) {
    // Find which stage IDs are part of the cycle
    const cycleNodes: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg > 0) cycleNodes.push(id);
    }

    // Report an error for each stage in the cycle
    cycleNodes.forEach((stageId) => {
      const stageIndex = stages.findIndex(
        (s) => isObject(s) && s.id === stageId,
      );
      const idxStr = stageIndex >= 0 ? `stages[${stageIndex}]` : `stages[?]`;
      err(
        errors,
        `${idxStr}.prerequisiteStageIds`,
        'prerequisiteStageIds',
        `Stage "${stageId}" is part of a circular prerequisite chain involving: ${cycleNodes.join(', ')}`,
        'no circular dependency',
        stageId,
      );
    });
  }
}

/** ChallengeLevel generatorConfigs must cover all QuestionTypes in stage levels */
function checkChallengeCoverage(
  stages: Obj[],
  errors: ValidationError[],
): void {
  stages.forEach((stage, si) => {
    // Collect all question types used across regular levels
    const levelTypes = new Set<string>();
    if (isArray(stage.levels)) {
      (stage.levels as unknown[]).forEach((level) => {
        if (
          isObject(level) &&
          isObject(level.generatorConfig) &&
          isArray((level.generatorConfig as Obj).questionTypes)
        ) {
          for (const qt of (level.generatorConfig as Obj).questionTypes as unknown[]) {
            if (typeof qt === 'string') levelTypes.add(qt);
          }
        }
      });
    }

    if (levelTypes.size === 0) return; // nothing to check (levels validation caught this)

    // Collect all question types covered by challenge generatorConfigs
    const challengeTypes = new Set<string>();
    const cl = stage.challengeLevel;
    if (isObject(cl) && isArray((cl as Obj).generatorConfigs)) {
      for (const cfg of (cl as Obj).generatorConfigs as unknown[]) {
        if (isObject(cfg) && isArray((cfg as Obj).questionTypes)) {
          for (const qt of (cfg as Obj).questionTypes as unknown[]) {
            if (typeof qt === 'string') challengeTypes.add(qt);
          }
        }
      }
    }

    const uncovered = [...levelTypes].filter((qt) => !challengeTypes.has(qt));
    if (uncovered.length > 0) {
      err(
        errors,
        `stages[${si}].challengeLevel.generatorConfigs`,
        'generatorConfigs',
        `ChallengeLevel does not cover question type(s) used in the stage's levels: ${uncovered.join(', ')}`,
        `all of: ${[...levelTypes].join(', ')}`,
        `covers: ${[...challengeTypes].join(', ') || '(none)'}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Root bundle validator
// ---------------------------------------------------------------------------

function validateBundle(bundle: unknown, errors: ValidationError[]): void {
  if (!isObject(bundle)) {
    err(
      errors,
      '',
      'bundle',
      'ContentBundle must be a JSON object',
      'object',
      bundle,
    );
    return;
  }

  // Top-level required fields
  const cv = bundle.contentVersion;
  if (!isInteger(cv) || (cv as number) < 0) {
    err(
      errors,
      'contentVersion',
      'contentVersion',
      '"contentVersion" must be a non-negative integer',
      'integer >= 0',
      cv,
    );
  }
  const sv = bundle.schemaVersion;
  if (!isInteger(sv) || (sv as number) < 0) {
    err(
      errors,
      'schemaVersion',
      'schemaVersion',
      '"schemaVersion" must be a non-negative integer',
      'integer >= 0',
      sv,
    );
  }

  // modes
  const modesValid = requireNonEmptyArray(errors, bundle, 'modes', '');
  const modeIds = new Set<string>();
  if (modesValid) {
    (bundle.modes as unknown[]).forEach((mode, i) => {
      validateMode(mode, `modes[${i}]`, errors);
      if (isObject(mode) && isNonEmptyString(mode.id)) {
        modeIds.add(mode.id as string);
      }
    });
  }

  // stages
  const stagesValid = requireNonEmptyArray(errors, bundle, 'stages', '');
  const stageById = new Map<string, Obj>();
  let stages: Obj[] = [];
  if (stagesValid) {
    stages = bundle.stages as unknown[] as Obj[];
    stages.forEach((stage, i) => {
      validateStage(stage, `stages[${i}]`, errors);
      if (isObject(stage) && isNonEmptyString(stage.id)) {
        stageById.set(stage.id as string, stage);
      }
    });
  }

  // cosmetics
  if (requireArray(errors, bundle, 'cosmetics', '')) {
    (bundle.cosmetics as unknown[]).forEach((cosmetic, i) => {
      validateCosmetic(cosmetic, `cosmetics[${i}]`, errors);
    });
  }

  // Cross-field checks (only run if we have parseable data)
  if (stagesValid) {
    checkModeIdReferences(stages, modeIds, errors);           // sub-task 2
    checkPrerequisiteReferences(stages, stageById, errors);   // sub-task 3
    checkCircularPrerequisites(stages, errors);                // sub-task 4
    checkChallengeCoverage(stages, errors);                   // sub-task 9
  }
}
