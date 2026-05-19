import { describe, it, expect } from 'vitest';
import { autoLineup51 } from '@/lib/lineup51';
import type { Player } from '@/types/volleyball';

function p(id: string, role: Player['role'], opts: Partial<Player> = {}): Player {
  return { id, number: parseInt(id.replace(/\D/g, ''), 10) || 1, lastName: id, firstName: '', role, isLibero: false, isCaptain: false, ...opts };
}

describe('autoLineup51', () => {
  it('assegna correttamente gli slot con roster completo', () => {
    const roster: Player[] = [
      p('s1', 'S'),
      p('op1', 'OP'),
      p('m1', 'M'), p('m2', 'M'),
      p('o1', 'O'), p('o2', 'O'),
      p('l1', 'L', { isLibero: true }),
    ];
    const lu = autoLineup51(roster)!;
    expect(lu).not.toBeNull();
    expect(lu.p1).toBe('s1');      // P=Setter in P1
    expect(lu.p4).toBe('op1');     // OPP in P4 (opposto)
    expect(lu.setter).toBe('s1');
    expect(lu.libero1).toBe('l1');
    // I due centrali finiscono in P2 e P5
    expect([lu.p2, lu.p5].sort()).toEqual(['m1', 'm2'].sort());
    // I due schiacciatori in P3 e P6
    expect([lu.p3, lu.p6].sort()).toEqual(['o1', 'o2'].sort());
  });

  it('ritorna null se manca un ruolo essenziale', () => {
    const roster: Player[] = [
      p('s1', 'S'), p('op1', 'OP'),
      p('m1', 'M'), // solo 1 centrale
      p('o1', 'O'), p('o2', 'O'),
    ];
    expect(autoLineup51(roster)).toBeNull();
  });

  it('usa giocatore universale come schiacciatore se mancano OH', () => {
    const roster: Player[] = [
      p('s1', 'S'), p('op1', 'OP'),
      p('m1', 'M'), p('m2', 'M'),
      p('o1', 'O'),
      p('u1', 'U'),
    ];
    const lu = autoLineup51(roster);
    expect(lu).not.toBeNull();
  });

  it('libero1/libero2 null se nessun libero a roster', () => {
    const roster: Player[] = [
      p('s1', 'S'), p('op1', 'OP'),
      p('m1', 'M'), p('m2', 'M'),
      p('o1', 'O'), p('o2', 'O'),
    ];
    const lu = autoLineup51(roster)!;
    expect(lu.libero1).toBeNull();
    expect(lu.libero2).toBeNull();
  });
});
