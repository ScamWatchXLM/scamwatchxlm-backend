import { describe, expect, it } from 'vitest';

import { isAtLeast, maxSeverity, parseSeverity } from '../../../src/alerts/severity.js';

describe('severity utils', () => {
  it('isAtLeast compares severities in order', () => {
    expect(isAtLeast('HIGH', 'MEDIUM')).toBe(true);
    expect(isAtLeast('LOW', 'MEDIUM')).toBe(false);
    expect(isAtLeast('CRITICAL', 'CRITICAL')).toBe(true);
  });

  it('maxSeverity returns the more severe value', () => {
    expect(maxSeverity('LOW', 'HIGH')).toBe('HIGH');
    expect(maxSeverity('CRITICAL', 'MEDIUM')).toBe('CRITICAL');
  });

  it('parseSeverity is case-insensitive and rejects unknown values', () => {
    expect(parseSeverity('high')).toBe('HIGH');
    expect(parseSeverity('bogus')).toBeNull();
  });
});
