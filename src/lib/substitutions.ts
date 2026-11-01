import type { MatchEvent, SubstitutionEvent } from '@/types/matchEvents';
import type { Player } from '@/types/volleyball';

/** Sostituzioni massime per squadra e per set (le sostituzioni del libero non contano). */
export const MAX_SUBSTITUTIONS = 8;

/**
 * Coppie di sostituzione del set: se A esce per B, A e B diventano "partner".
 * Un giocatore può avere un solo partner: non può sostituirne (o essere sostituito da) due diversi.
 * Le sostituzioni in cui compare un libero non creano coppie.
 */
export function substitutionPartners(
  events: MatchEvent[],
  team: 'home' | 'away',
  setNumber: number,
  players: Player[],
): Map<number, number> {
  const libero = new Set(players.filter((p) => p.isLibero).map((p) => p.number));
  const partners = new Map<number, number>();
  for (const e of events) {
    if (e.type !== 'substitution') continue;
    const s = e as SubstitutionEvent;
    if (s.team !== team || s.setNumber !== setNumber) continue;
    if (libero.has(s.playerOut) || libero.has(s.playerIn)) continue;
    partners.set(s.playerOut, s.playerIn);
    partners.set(s.playerIn, s.playerOut);
  }
  return partners;
}

/** true se il cambio out → in rispetta la regola "un solo partner per giocatore". */
export function pairAllowed(partners: Map<number, number>, out: number, inn: number): boolean {
  const pOut = partners.get(out);
  const pIn = partners.get(inn);
  if (pOut !== undefined && pOut !== inn) return false;
  if (pIn !== undefined && pIn !== out) return false;
  return true;
}

/** Il cambio conta nel limite solo se non coinvolge un libero. */
export function countsTowardsLimit(players: Player[], out: number, inn: number): boolean {
  const lib = (n: number) => !!players.find((p) => p.number === n)?.isLibero;
  return !lib(out) && !lib(inn);
}
