import fc from 'fast-check';

// A simple utility function to test
const add = (a: number, b: number) => a + b;

describe('Math Operations - Property Based Testing', () => {
  it('should always satisfy the commutative property (a + b === b + a)', () => {
    // fc.assert runs the property check 100 times with random inputs
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(add(a, b)).toBe(add(b, a));
      }),
    );
  });

  it('should always result in a string length greater than or equal to original when formatting', () => {
    fc.assert(
      fc.property(fc.string(), text => {
        const formatted = text.trim().toUpperCase();
        expect(formatted.length).toBeLessThanOrEqual(text.length);
      }),
    );
  });
});
