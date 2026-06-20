import type { TeamTacticalPhase } from './tacticalPhases';
import type { ReceptionFormations, SlotPositions } from './receptionFormations';
import { getReceptionPositions, getAttackPositions, getDefensePositions } from './receptionFormations';
import { getPhaseLayout } from './tacticalPhases';

export interface CourtCoord { x: number; y: number; }

// Setter release a rete zona 2
// HOME: rete a sinistra, x piccolo
export const SETTER_RELEASE_HOME: CourtCoord = { x: 22, y: 22 };
// AWAY: rete a destra, x grande
export const SETTER_RELEASE_AWAY: CourtCoord = { x: 78, y: 78 };

// Posizioni base di rotazione P1..P6 (in %), condivise tra VolleyballCourt (rendering)
// e la risoluzione zona del tocco live (LiveScout).
export const POS_AWAY: Record<number, CourtCoord> = {
  2: { x: 78, y: 78 }, 3: { x: 78, y: 50 }, 4: { x: 78, y: 22 },
  1: { x: 28, y: 78 }, 6: { x: 28, y: 50 }, 5: { x: 28, y: 22 },
};
export const POS_HOME: Record<number, CourtCoord> = {
  2: { x: 22, y: 22 }, 3: { x: 22, y: 50 }, 4: { x: 22, y: 78 },
  1: { x: 72, y: 22 }, 6: { x: 72, y: 50 }, 5: { x: 72, y: 78 },
};

// Centri delle 9 zone DVW (per heatmap, overlay, e risoluzione zona del tocco live)
export const ZONE_CENTERS_AWAY: { zone: number; x: number; y: number }[] = [
  { zone: 4, x: 78, y: 22 }, { zone: 3, x: 78, y: 50 }, { zone: 2, x: 78, y: 78 },
  { zone: 5, x: 28, y: 22 }, { zone: 6, x: 28, y: 50 }, { zone: 1, x: 28, y: 78 },
  { zone: 7, x: 6,  y: 22 }, { zone: 8, x: 6,  y: 50 }, { zone: 9, x: 6,  y: 78 },
];
export const ZONE_CENTERS_HOME: { zone: number; x: number; y: number }[] = [
  { zone: 4, x: 22, y: 78 }, { zone: 3, x: 22, y: 50 }, { zone: 2, x: 22, y: 22 },
  { zone: 5, x: 72, y: 78 }, { zone: 6, x: 72, y: 50 }, { zone: 1, x: 72, y: 22 },
  { zone: 7, x: 94, y: 78 }, { zone: 8, x: 94, y: 50 }, { zone: 9, x: 94, y: 22 },
];

export function isSetterReleasePhase(phase: TeamTacticalPhase): boolean {
  return (
    phase === 'after_reception_setter_release' ||
    phase === 'side_out_setter_release' ||
    phase === 'break_point_setter_release'
  );
}

/**
 * Ritorna la posizione override per una giocatrice in base alla fase.
 * Solo il setter riceve un override nelle fasi di setter_release.
 * null = usa la posizione normale (formazione o rotazione).
 */
export function getPhasePositionOverride(
  phase: TeamTacticalPhase,
  slotPos: number,
  setterPosition: number,
  isHome: boolean,
): CourtCoord | null {
  if (!isSetterReleasePhase(phase)) return null;
  if (slotPos !== setterPosition) return null;
  return isHome ? SETTER_RELEASE_HOME : SETTER_RELEASE_AWAY;
}

export interface ResolvePlayerPositionArgs {
  team: 'home' | 'away';
  slotPos: number;
  setterPosition: number;
  phase: TeamTacticalPhase;
  receptionFormations: ReceptionFormations;
  attackFormations: ReceptionFormations | null;
  defenseFormations: ReceptionFormations;
}

/**
 * Calcola la posizione FINALE EFFETTIVA (x,y sul campo, asse x=profondità/rete,
 * asse y=lato) per uno slot di rotazione, applicando esattamente la stessa
 * priorità già usata da VolleyballCourt per il rendering visivo:
 * phaseOverride (setter release) > formationPos (schema configurato, con
 * trasposizione assi rete-in-alto -> rete-laterale) > basePos (rotazione standard).
 *
 * Usata sia da VolleyballCourt (per disegnare il marker) sia da LiveScout
 * (per dedurre la zona DVW del tocco) — stessa funzione, stesso risultato,
 * nessuna possibilità che le due si disallineino.
 */
export function resolvePlayerPosition(args: ResolvePlayerPositionArgs): CourtCoord {
  const { team, slotPos, setterPosition, phase, receptionFormations, attackFormations, defenseFormations } = args;
  const isHome = team === 'home';
  const basePos = isHome ? POS_HOME[slotPos] : POS_AWAY[slotPos];

  const phaseLayout = getPhaseLayout(phase);
  let overridePositions: SlotPositions | null = null;
  if (phaseLayout === 'reception') {
    overridePositions = getReceptionPositions(receptionFormations, setterPosition, false);
  } else if (phaseLayout === 'attack') {
    overridePositions = getAttackPositions(attackFormations ?? receptionFormations, setterPosition, false);
  } else if (phaseLayout === 'defense') {
    overridePositions = getDefensePositions(defenseFormations, setterPosition, false);
  }

  const rawFormationPos = overridePositions?.[slotPos as 1 | 2 | 3 | 4 | 5 | 6] ?? null;
  const formationPos = rawFormationPos
    ? {
        x: isHome ? rawFormationPos.y : 100 - rawFormationPos.y,
        y: rawFormationPos.x,
      }
    : null;

  const phaseOverride = getPhasePositionOverride(phase, slotPos, setterPosition, isHome);

  return phaseOverride ?? formationPos ?? basePos;
}

/**
 * Trova la zona DVW (1-9) più vicina a una coordinata (x,y) sul campo,
 * usando distanza euclidea dai centri di zona già usati per heatmap/overlay.
 * Usata per dedurre la zona del tocco dalla posizione effettiva del giocatore
 * selezionato, nel flusso semplificato (tocca il giocatore, zona implicita).
 */
export function nearestZone(team: 'home' | 'away', pos: CourtCoord): number {
  const centers = team === 'home' ? ZONE_CENTERS_HOME : ZONE_CENTERS_AWAY;
  let bestZone = centers[0].zone;
  let bestDist = Infinity;
  for (const c of centers) {
    const d = Math.hypot(pos.x - c.x, pos.y - c.y);
    if (d < bestDist) { bestDist = d; bestZone = c.zone; }
  }
  return bestZone;
}
