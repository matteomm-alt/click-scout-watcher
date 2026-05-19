import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECEPTION_FORMATIONS,
  cloneDefaultFormations,
  getReceptionPositions,
} from '@/lib/receptionFormations';

describe('receptionFormations', () => {
  it('ha 6 rotazioni con 6 slot ciascuna', () => {
    for (let sp = 1; sp <= 6; sp++) {
      const f = DEFAULT_RECEPTION_FORMATIONS[sp as 1|2|3|4|5|6];
      expect(Object.keys(f)).toHaveLength(6);
      for (let s = 1; s <= 6; s++) {
        const coord = f[s as 1|2|3|4|5|6];
        expect(coord.x).toBeGreaterThanOrEqual(0);
        expect(coord.x).toBeLessThanOrEqual(100);
        expect(coord.y).toBeGreaterThanOrEqual(0);
        expect(coord.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('cloneDefaultFormations è una copia profonda indipendente', () => {
    const clone = cloneDefaultFormations();
    clone[1][1].x = 999;
    expect(DEFAULT_RECEPTION_FORMATIONS[1][1].x).not.toBe(999);
  });

  it('mirror specchia y → 100 - y senza toccare x', () => {
    const pos = getReceptionPositions(DEFAULT_RECEPTION_FORMATIONS, 1, true);
    const base = DEFAULT_RECEPTION_FORMATIONS[1];
    expect(pos[1].x).toBe(base[1].x);
    expect(pos[1].y).toBe(100 - base[1].y);
  });

  it('mirror=false ritorna il riferimento originale', () => {
    const pos = getReceptionPositions(DEFAULT_RECEPTION_FORMATIONS, 3, false);
    expect(pos).toBe(DEFAULT_RECEPTION_FORMATIONS[3]);
  });

  it('clamp del setterPosition fuori range', () => {
    const pos1 = getReceptionPositions(DEFAULT_RECEPTION_FORMATIONS, 0, false);
    expect(pos1).toBe(DEFAULT_RECEPTION_FORMATIONS[1]);
    const pos6 = getReceptionPositions(DEFAULT_RECEPTION_FORMATIONS, 99, false);
    expect(pos6).toBe(DEFAULT_RECEPTION_FORMATIONS[6]);
  });
});
