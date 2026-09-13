/**
 * ContentValidator.test.ts
 *
 * Unit tests for validateContentBundle() covering all passing and failing
 * cases from the testing strategy in design.md (Content Schema Validation section).
 */

import { validateContentBundle } from '../src/services/ContentValidator';

// ---------------------------------------------------------------------------
// Minimal valid bundle helpers
// ---------------------------------------------------------------------------

function makeValidGeneratorConfig(): Record<string, unknown> {
  return {
    questionTypes: ['multiple-choice'],
    operands: { min: 1, max: 10 },
    allowNegatives: false,
    allowFractions: false,
    allowDecimals: false,
    variableCount: null,
    difficultyRange: [1, 5],
  };
}

function makeValidLevel(order = 1): Record<string, unknown> {
  return {
    id: `level-${order}`,
    stageId: 'stage-1',
    order,
    title: `Level ${order}`,
    introduction: null,
    hintAllowance: 3,
    questionCount: 10,
    timeLimit: null,
    generatorConfig: makeValidGeneratorConfig(),
    starThresholds: { oneStar: 50, twoStar: 70, threeStar: 90 },
  };
}

function makeValidChallengeLevel(): Record<string, unknown> {
  return {
    id: 'challenge-1',
    stageId: 'stage-1',
    title: 'Stage Challenge',
    questionCount: 15,
    timeLimit: null,
    passingAccuracy: 0.7,
    retryAllowed: true,
    difficultyWeights: { easy: 0.2, medium: 0.3, hard: 0.5 },
    generatorConfigs: [makeValidGeneratorConfig()],
  };
}

function makeValidStage(id = 'stage-1', modeId = 'mode-1'): Record<string, unknown> {
  return {
    id,
    modeId,
    title: 'Stage One',
    description: 'First stage',
    order: 1,
    prerequisiteStageIds: [],
    passingStarThreshold: 5,
    levels: [makeValidLevel(1), makeValidLevel(2)],
    challengeLevel: makeValidChallengeLevel(),
  };
}

function makeValidMode(id = 'mode-1'): Record<string, unknown> {
  return {
    id,
    title: 'Arithmetic',
    description: 'Basic arithmetic',
    order: 1,
    stageIds: ['stage-1'],
  };
}

function makeValidCosmetic(): Record<string, unknown> {
  return {
    id: 'cosmetic-1',
    type: 'badge',
    name: 'First Steps',
    description: 'Complete your first level',
    assetRef: 'assets/badge1.png',
    unlockCondition: { type: 'xp-threshold', value: 100 },
  };
}

function makeValidBundle(): Record<string, unknown> {
  return {
    contentVersion: 1,
    schemaVersion: 1,
    modes: [makeValidMode()],
    stages: [makeValidStage()],
    cosmetics: [makeValidCosmetic()],
  };
}

// ---------------------------------------------------------------------------
// Passing Cases
// ---------------------------------------------------------------------------

describe('Passing cases', () => {
  it('valid complete bundle returns { valid: true, errors: [] }', () => {
    const result = validateContentBundle(makeValidBundle());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('bundle with empty cosmetics array is valid', () => {
    const bundle = makeValidBundle();
    bundle.cosmetics = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('bundle with multiple stages and a valid prerequisite chain (no cycles) is valid', () => {
    const bundle = makeValidBundle();
    const stage2 = makeValidStage('stage-2', 'mode-1');
    (stage2 as any).order = 2;
    (stage2.levels as any[])[0].stageId = 'stage-2';
    (stage2.levels as any[])[1].stageId = 'stage-2';
    (stage2.challengeLevel as any).stageId = 'stage-2';
    (stage2 as any).prerequisiteStageIds = ['stage-1'];
    (bundle.stages as any[]).push(stage2);
    (bundle.modes as any[])[0].stageIds = ['stage-1', 'stage-2'];

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('bundle with all 7 QuestionTypes in levels and all covered in challengeLevel is valid', () => {
    const allTypes = [
      'multiple-choice',
      'numeric-input',
      'drag-and-drop',
      'tile-selection',
      'equation-balance',
      'fill-in-the-blank',
      'order-operations',
    ];
    const bundle = makeValidBundle();
    const stage = (bundle.stages as any[])[0];

    // Assign each level a different question type
    stage.levels = allTypes.map((qt: string, i: number) => {
      const level = makeValidLevel(i + 1);
      (level.generatorConfig as any).questionTypes = [qt];
      return level;
    });

    // Challenge covers all types
    const challengeConfigs = allTypes.map((qt: string) => {
      const cfg = makeValidGeneratorConfig();
      (cfg as any).questionTypes = [qt];
      return cfg;
    });
    stage.challengeLevel.generatorConfigs = challengeConfigs;

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passingAccuracy exactly 0 is valid', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = 0;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passingAccuracy exactly 1 is valid', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = 1;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('difficultyWeights summing to 0.999 passes (within ±0.001 tolerance)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.difficultyWeights = {
      easy: 0.333,
      medium: 0.333,
      hard: 0.333,
    };
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('difficultyWeights summing to 1.001 passes (within ±0.001 tolerance)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.difficultyWeights = {
      easy: 0.334,
      medium: 0.334,
      hard: 0.333,
    };
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Top-level bundle failures
// ---------------------------------------------------------------------------

describe('Top-level bundle failures', () => {
  it('null input fails with descriptive error', () => {
    const result = validateContentBundle(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('array input fails with descriptive error', () => {
    const result = validateContentBundle([]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('string input fails with descriptive error', () => {
    const result = validateContentBundle('not-an-object');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('missing contentVersion fails', () => {
    const bundle = makeValidBundle();
    delete (bundle as any).contentVersion;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'contentVersion')).toBe(true);
  });

  it('missing schemaVersion fails', () => {
    const bundle = makeValidBundle();
    delete (bundle as any).schemaVersion;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'schemaVersion')).toBe(true);
  });

  it('missing modes array fails', () => {
    const bundle = makeValidBundle();
    delete (bundle as any).modes;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'modes')).toBe(true);
  });

  it('missing stages array fails', () => {
    const bundle = makeValidBundle();
    delete (bundle as any).stages;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'stages')).toBe(true);
  });

  it('empty modes array fails', () => {
    const bundle = makeValidBundle();
    bundle.modes = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'modes')).toBe(true);
  });

  it('empty stages array fails', () => {
    const bundle = makeValidBundle();
    bundle.stages = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'stages')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mode validation failures
// ---------------------------------------------------------------------------

describe('Mode validation failures', () => {
  it('mode missing id fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.modes as any[])[0].id;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('mode missing title fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.modes as any[])[0].title;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('mode missing description fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.modes as any[])[0].description;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('mode with non-integer order fails', () => {
    const bundle = makeValidBundle();
    (bundle.modes as any[])[0].order = 1.5;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'order')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stage validation failures
// ---------------------------------------------------------------------------

describe('Stage validation failures', () => {
  it('stage missing id fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].id;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('stage missing title fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].title;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('stage missing description fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].description;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('stage missing challengeLevel fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].challengeLevel;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'challengeLevel')).toBe(true);
  });

  it('stage with empty levels array fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'levels')).toBe(true);
  });

  it('stage with order = 0 fails (must be >= 1)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].order = 0;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'order')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Level validation failures
// ---------------------------------------------------------------------------

describe('Level validation failures', () => {
  it('level missing id fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].levels[0].id;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('level missing title fails', () => {
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].levels[0].title;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('level with non-integer order fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].order = 'first';
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'order')).toBe(true);
  });

  it('level with questionCount = 0 fails (must be >= 1)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].questionCount = 0;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'questionCount')).toBe(true);
  });

  it('two levels in the same stage with duplicate order values fail (rule 5)', () => {
    const bundle = makeValidBundle();
    // Both levels have order = 1
    (bundle.stages as any[])[0].levels[0].order = 1;
    (bundle.stages as any[])[0].levels[1].order = 1;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'order')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ChallengeLevel validation failures
// ---------------------------------------------------------------------------

describe('ChallengeLevel validation failures', () => {
  it('passingAccuracy = -0.01 fails (rule 6)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = -0.01;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'passingAccuracy')).toBe(true);
  });

  it('passingAccuracy = 1.01 fails (rule 6)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = 1.01;
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'passingAccuracy')).toBe(true);
  });

  it('difficultyWeights summing to 0.9 fails (rule 7)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.difficultyWeights = {
      easy: 0.2,
      medium: 0.3,
      hard: 0.4, // sum = 0.9
    };
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'difficultyWeights')).toBe(true);
  });

  it('difficultyWeights summing to 1.1 fails (rule 7)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.difficultyWeights = {
      easy: 0.3,
      medium: 0.4,
      hard: 0.4, // sum = 1.1
    };
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'difficultyWeights')).toBe(true);
  });

  it('generatorConfigs is empty array fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].challengeLevel.generatorConfigs = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'generatorConfigs')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GeneratorConfig validation failures
// ---------------------------------------------------------------------------

describe('GeneratorConfig validation failures', () => {
  it('difficultyRange[0] > difficultyRange[1] fails (rule 8) — e.g., [7, 3]', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].generatorConfig.difficultyRange = [7, 3];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'difficultyRange')).toBe(true);
  });

  it('difficultyRange with only 1 element fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].generatorConfig.difficultyRange = [3];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'difficultyRange')).toBe(true);
  });

  it('questionTypes empty array fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].generatorConfig.questionTypes = [];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'questionTypes')).toBe(true);
  });

  it('unknown QuestionType string fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].generatorConfig.questionTypes = ['not-a-real-type'];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'questionTypes')).toBe(true);
  });

  it('allowNegatives not boolean fails', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].levels[0].generatorConfig.allowNegatives = 'yes';
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'allowNegatives')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-field validation failures
// ---------------------------------------------------------------------------

describe('Cross-field validation failures', () => {
  it('stage with modeId referencing an undefined mode fails (rule 2)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].modeId = 'nonexistent-mode';
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'modeId')).toBe(true);
  });

  it('stage with prerequisiteStageIds referencing a non-existent stage fails (rule 3)', () => {
    const bundle = makeValidBundle();
    (bundle.stages as any[])[0].prerequisiteStageIds = ['does-not-exist'];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'prerequisiteStageIds')).toBe(true);
  });

  it('stage with prerequisiteStageIds referencing a stage from a different mode fails (rule 3)', () => {
    const bundle = makeValidBundle();
    // Add a second mode and a stage belonging to it
    const mode2 = makeValidMode('mode-2');
    (mode2 as any).order = 2;
    const stage2 = makeValidStage('stage-2', 'mode-2');
    (stage2 as any).order = 1;
    (stage2.levels as any[])[0].stageId = 'stage-2';
    (stage2.levels as any[])[1].stageId = 'stage-2';
    (stage2.challengeLevel as any).stageId = 'stage-2';
    (bundle.modes as any[]).push(mode2);
    (bundle.stages as any[]).push(stage2);

    // stage-1 (mode-1) references stage-2 (mode-2) as prerequisite — cross-mode, invalid
    (bundle.stages as any[])[0].prerequisiteStageIds = ['stage-2'];

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'prerequisiteStageIds')).toBe(true);
  });

  it('circular prerequisites: A → B, B → A both appear in errors (rule 4)', () => {
    const bundle = makeValidBundle();

    const stageA = makeValidStage('stage-a', 'mode-1');
    (stageA as any).order = 1;
    (stageA as any).prerequisiteStageIds = ['stage-b'];
    (stageA.levels as any[])[0].stageId = 'stage-a';
    (stageA.levels as any[])[1].stageId = 'stage-a';
    (stageA.challengeLevel as any).stageId = 'stage-a';

    const stageB = makeValidStage('stage-b', 'mode-1');
    (stageB as any).order = 2;
    (stageB as any).prerequisiteStageIds = ['stage-a'];
    (stageB.levels as any[])[0].stageId = 'stage-b';
    (stageB.levels as any[])[1].stageId = 'stage-b';
    (stageB.challengeLevel as any).stageId = 'stage-b';

    bundle.stages = [stageA, stageB];
    (bundle.modes as any[])[0].stageIds = ['stage-a', 'stage-b'];

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    // Both stage-a and stage-b should appear in cycle errors
    const cycleErrors = result.errors.filter((e) => e.field === 'prerequisiteStageIds');
    expect(cycleErrors.length).toBeGreaterThanOrEqual(2);
    const errorText = cycleErrors.map((e) => e.message).join(' ');
    expect(errorText).toContain('stage-a');
    expect(errorText).toContain('stage-b');
  });

  it('three-stage cycle A → B → C → A all appear in errors (rule 4)', () => {
    const bundle = makeValidBundle();

    const makeStage = (id: string, prereqId: string): Record<string, unknown> => {
      const s = makeValidStage(id, 'mode-1');
      (s as any).prerequisiteStageIds = [prereqId];
      (s.levels as any[])[0].stageId = id;
      (s.levels as any[])[1].stageId = id;
      (s.challengeLevel as any).stageId = id;
      return s;
    };

    bundle.stages = [
      makeStage('stage-a', 'stage-c'), // A → C
      makeStage('stage-b', 'stage-a'), // B → A
      makeStage('stage-c', 'stage-b'), // C → B => cycle
    ];
    // Fix orders to be unique
    (bundle.stages as any[])[0].order = 1;
    (bundle.stages as any[])[1].order = 2;
    (bundle.stages as any[])[2].order = 3;

    (bundle.modes as any[])[0].stageIds = ['stage-a', 'stage-b', 'stage-c'];

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    const cycleErrors = result.errors.filter((e) => e.field === 'prerequisiteStageIds');
    expect(cycleErrors.length).toBeGreaterThanOrEqual(3);
    const errorText = cycleErrors.map((e) => e.message).join(' ');
    expect(errorText).toContain('stage-a');
    expect(errorText).toContain('stage-b');
    expect(errorText).toContain('stage-c');
  });

  it('ChallengeLevel generatorConfigs missing a QuestionType used in a level fails (rule 9)', () => {
    const bundle = makeValidBundle();
    // Level uses 'numeric-input', but challenge only covers 'multiple-choice'
    (bundle.stages as any[])[0].levels[0].generatorConfig.questionTypes = ['numeric-input'];
    (bundle.stages as any[])[0].challengeLevel.generatorConfigs = [
      makeValidGeneratorConfig(), // covers only 'multiple-choice'
    ];
    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'generatorConfigs')).toBe(true);
    const coverageError = result.errors.find((e) => e.field === 'generatorConfigs');
    expect(coverageError?.message).toContain('numeric-input');
  });
});

// ---------------------------------------------------------------------------
// Error message quality
// ---------------------------------------------------------------------------

describe('Error message quality', () => {
  it('each error has non-empty path, field, message, expected, and received strings', () => {
    // Produce a bundle with multiple validation errors
    const bundle = makeValidBundle();
    delete (bundle.stages as any[])[0].id;
    delete (bundle.stages as any[])[0].title;
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = -1;

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    for (const error of result.errors) {
      expect(typeof error.path).toBe('string');
      // path may be empty string for root errors, so only check non-root errors
      expect(typeof error.field).toBe('string');
      expect(error.field.length).toBeGreaterThan(0);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
      expect(typeof error.expected).toBe('string');
      expect(error.expected.length).toBeGreaterThan(0);
      expect(typeof error.received).toBe('string');
      expect(error.received.length).toBeGreaterThan(0);
    }
  });

  it('validator collects ALL errors before returning (not short-circuit on first error)', () => {
    // Introduce multiple independent errors across different fields
    const bundle = makeValidBundle();
    delete (bundle as any).contentVersion;          // error 1
    delete (bundle as any).schemaVersion;           // error 2
    (bundle.stages as any[])[0].order = 0;          // error 3
    (bundle.stages as any[])[0].challengeLevel.passingAccuracy = 2; // error 4

    const result = validateContentBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);

    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('contentVersion');
    expect(fields).toContain('schemaVersion');
    expect(fields).toContain('order');
    expect(fields).toContain('passingAccuracy');
  });
});
