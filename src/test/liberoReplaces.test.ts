import { describe, it, expect } from 'vitest';
import { applyLiberoAutoSwap } from '@/lib/matchReplay';
import type { Team } from '@/types/volleyball';

const team = {
  name: 'T',
  players: [
    { id: 'a', number: 1, lastName: 'S', role: 'S' },
    { id: 'b', number: 2, lastName: 'L', role: 'L', isLibero: true },
    { id: 'c', number: 3, lastName: 'M1', role: 'M' },
    { id: 'd', number: 4, lastName: 'O1', role: 'O' },
    { id: 'e', number: 5, lastName: 'P', role: 'O' },
    { id: 'f', number: 6, lastName: 'M2', role: 'M' },
    { id: 'g', number: 7, lastName: 'O2', role: 'O' },
  ],
} as unknown as Team;

describe('libero sostituisce giocatrici scelte', () => {
  it('entra al posto della giocatrice scelta in seconda linea, non della centrale', () => {
    // P1..P6 = 1,4,6,5,7,3 → P5=7 (O2), P6=3 (M1)
    const r = applyLiberoAutoSwap([1, 4, 6, 5, 7, 3], team, 2, null, [7]);
    expect(r.lineup[4]).toBe(2);
    expect(r.lineup[5]).toBe(3);
    expect(r.benchedMb).toBe(7);
  });
  it('senza scelta usa la centrale', () => {
    const r = applyLiberoAutoSwap([1, 4, 6, 5, 7, 3], team, 2, null, []);
    expect(r.lineup[5]).toBe(2);
    expect(r.benchedMb).toBe(3);
  });
  it('esce dalla prima linea e rientra la giocatrice scelta', () => {
    const r = applyLiberoAutoSwap([4, 6, 5, 2, 3, 1], team, 2, 7, [7]);
    expect(r.lineup[3]).toBe(7);
    expect(r.lineup).not.toContain(2);
  });
});
