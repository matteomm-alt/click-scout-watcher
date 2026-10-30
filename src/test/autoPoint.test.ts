import { describe, it, expect } from 'vitest';
import { autoPointWinner } from '@/lib/autoPoint';

describe('autoPointWinner', () => {
  it('# su battuta, attacco, muro: punto a chi tocca', () => {
    for (const sk of ['S', 'A', 'B'] as const) {
      expect(autoPointWinner(sk, '#', 'home')).toBe('home');
      expect(autoPointWinner(sk, '#', 'away')).toBe('away');
    }
  });
  it('# su ricezione/alzata/difesa/freeball non assegna punti', () => {
    for (const sk of ['R', 'E', 'D', 'F'] as const) expect(autoPointWinner(sk, '#', 'home')).toBeNull();
  });
  it('= su qualsiasi fondamentale: punto agli avversari', () => {
    for (const sk of ['S', 'R', 'A', 'B', 'E', 'D', 'F'] as const) {
      expect(autoPointWinner(sk, '=', 'home')).toBe('away');
      expect(autoPointWinner(sk, '=', 'away')).toBe('home');
    }
  });
  it('+ ! - / lasciano lo scambio aperto', () => {
    for (const ev of ['+', '!', '-', '/'] as const) expect(autoPointWinner('A', ev, 'home')).toBeNull();
  });
});
