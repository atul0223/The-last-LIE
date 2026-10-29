import { describe, expect, it } from 'vitest';
import { CLI_VERSION } from '../src/index';

describe('cli', () => {
  it('exports package version', () => {
    expect(CLI_VERSION).toBe('0.1.0');
  });
});
