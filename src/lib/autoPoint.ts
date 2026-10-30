import type { Skill, Evaluation } from '@/types/volleyball';

/**
 * Chi prende il punto in automatico dopo un tocco (opzione "Punto automatico").
 * Regole del manuale Click&Scout:
 *  - Battuta, Attacco o Muro con # → punto a chi ha toccato (ace, kill, muro vincente);
 *  - qualsiasi fondamentale con = (errore) → punto agli avversari
 *    (errore in battuta, ricezione, attacco, alzata, difesa, freeball, muro).
 * Gli altri esiti (/, !, -, +) lasciano lo scambio aperto: il punto va dato dall'operatore
 * o dal tocco successivo.
 */
export function autoPointWinner(
  skill: Skill,
  evaluation: Evaluation,
  team: 'home' | 'away',
): 'home' | 'away' | null {
  if (evaluation === '#' && (skill === 'S' || skill === 'A' || skill === 'B')) return team;
  if (evaluation === '=') return team === 'home' ? 'away' : 'home';
  return null;
}
