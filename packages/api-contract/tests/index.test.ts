import { describe, expect, it } from 'vitest';
import { API_CONTRACT_VERSION } from '../src/index.js';

describe('api-contract version', () => {
  it('exports semantic package version', () => {
    expect(API_CONTRACT_VERSION).toBe('0.2.0');
  });
});
