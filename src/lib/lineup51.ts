import type { Player, Lineup } from '@/types/volleyball';

/**
 * Schema 5-1 classico:
 * In senso antiorario partendo dal palleggiatore P:
 *   P → S1 → C2 → O → S2 → C1 → (torna a P)
 *
 * Posizioni iniziali (rotazione "P1" = palleggiatore in zona 1):
 *   P1 = P    P2 = C1   P3 = S2
 *   P4 = O    P5 = C2   P6 = S1
 *
 * Il libero entra al posto del centrale di seconda linea (qui C2 in P5).
 *
 * Mappatura ruoli volleyball:
 *   S  = Setter (palleggiatore)        → P
 *   OP = Opposite (opposto)             → O
 *   M  = Middle (centrale)              → C1, C2
 *   O  = Outside hitter (banda/schiacc.) → S1, S2
 *   L  = Libero
 */

type RoleSlot = 'P' | 'C1' | 'C2' | 'O' | 'S1' | 'S2';

// Mappatura: rotazione iniziale (P1) → quale slot di ruolo va in ogni posizione
const POS_TO_SLOT: Record<keyof Pick<Lineup, 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6'>, RoleSlot> = {
  p1: 'P',
  p2: 'C1',
  p3: 'S2',
  p4: 'O',
  p5: 'C2',
  p6: 'S1',
};

/**
 * Auto-assegna i giocatori del roster alle 6 posizioni secondo lo schema 5-1
 * con palleggiatore in P1 (rotazione iniziale tipica).
 *
 * Ritorna un Partial<Lineup> da passare a setHomeLineup/setAwayLineup.
 * Se il roster non ha tutti i ruoli necessari ritorna null.
 */
export function autoLineup51(players: Player[]): Partial<Lineup> | null {
  const setters = players.filter(p => p.role === 'S' && !p.isLibero);
  const opposites = players.filter(p => p.role === 'OP' && !p.isLibero);
  const middles = players.filter(p => p.role === 'M' && !p.isLibero);
  const outsides = players.filter(p => p.role === 'O' && !p.isLibero);
  const universals = players.filter(p => p.role === 'U' && !p.isLibero);
  const outsideSlots = [...outsides, ...universals.filter(u => !outsides.some(o => o.id === u.id))];
  const liberos = players.filter(p => p.isLibero || p.role === 'L');

  if (setters.length < 1 || opposites.length < 1 || middles.length < 2 || outsideSlots.length < 2) {
    return null;
  }

  const slots: Record<RoleSlot, Player> = {
    P: setters[0],
    O: opposites[0],
    C1: middles[0],
    C2: middles[1],
    S1: outsideSlots[0],
    S2: outsideSlots[1],
  };

  const lineup: Partial<Lineup> = {
    p1: slots[POS_TO_SLOT.p1].id,
    p2: slots[POS_TO_SLOT.p2].id,
    p3: slots[POS_TO_SLOT.p3].id,
    p4: slots[POS_TO_SLOT.p4].id,
    p5: slots[POS_TO_SLOT.p5].id,
    p6: slots[POS_TO_SLOT.p6].id,
    setter: slots.P.id,
    libero1: liberos[0]?.id ?? null,
    libero2: liberos[1]?.id ?? null,
  };

  return lineup;
}
