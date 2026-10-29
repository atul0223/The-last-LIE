import { describe, expect, it } from 'vitest';
import { CASE_ENGINE_VERSION } from '../src/index';

describe('case-engine', () => {
  it('exports package version', () => {
    expect(CASE_ENGINE_VERSION).toBe('0.1.0');
  });
});
