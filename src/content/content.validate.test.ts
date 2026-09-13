/**
 * Smoke test: validates the seed content.json passes ContentValidator with zero errors.
 */
import { validateContentBundle } from '../services/ContentValidator';
import bundle from './content.json';

describe('seed content.json', () => {
  it('passes ContentValidator with zero errors', () => {
    const result = validateContentBundle(bundle);
    if (!result.valid) {
      const summary = result.errors
        .map((e) => `  ${e.path} — ${e.message}`)
        .join('\n');
      throw new Error(`content.json has ${result.errors.length} error(s):\n${summary}`);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
