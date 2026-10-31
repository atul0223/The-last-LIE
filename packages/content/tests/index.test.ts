import { describe, expect, it } from 'vitest';
import { AUTHORED_CASES, CONTENT_VERSION, GENERATED_CASES } from '../src/index';

describe('content', () => {
  it('exports package version', () => {
    expect(CONTENT_VERSION).toBe('0.1.0');
  });

  it('exports authored cases without modification', () => {
    expect(AUTHORED_CASES).toHaveLength(4);
  });

  it('exports generated cases catalog', () => {
    expect(GENERATED_CASES).toHaveLength(24);
  });
});
