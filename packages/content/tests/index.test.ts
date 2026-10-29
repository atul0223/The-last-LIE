import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION } from '../src/index';

describe('content', () => {
  it('exports package version', () => {
    expect(CONTENT_VERSION).toBe('0.1.0');
  });
});
