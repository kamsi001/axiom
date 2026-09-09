/**
 * content.schema.ts
 *
 * Single import point for the Axiom content bundle JSON Schema.
 * Use `contentSchema` wherever runtime schema validation is needed
 * (e.g. ContentValidator, app startup checks).
 *
 * The schema is draft-07 and validates the shape of `content.json`.
 * Cross-field business rules (e.g. difficultyWeights summing to 1.0,
 * prerequisiteStageIds referencing valid stages) are enforced by
 * ContentValidator, not by this schema.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const contentSchema: object = require('./content.schema.json') as object;

export { contentSchema };
