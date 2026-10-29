import { describe, expect, it } from 'vitest';
import { API_CONTRACT_VERSION } from '../src/index';

describe('api-contract', () => {
  it('exports package version', () => {
    expect(API_CONTRACT_VERSION).toBe('0.1.0');
  });
});
