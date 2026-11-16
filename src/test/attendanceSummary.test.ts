import { describe, it, expect } from 'vitest';
import { pct } from '@/lib/attendanceSummary';

describe('pct', () => {
  it('arrotonda e gestisce zero rilevazioni', () => {
    expect(pct(1500, 1600)).toBe(94);
    expect(pct(2, 3)).toBe(67);
    expect(pct(0, 0)).toBe(0);
  });
});
