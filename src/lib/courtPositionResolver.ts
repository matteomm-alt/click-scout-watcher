import type { TeamTacticalPhase } from './tacticalPhases';

export interface CourtCoord { x: number; y: number; }

// Setter release a rete zona 2
// HOME: rete a sinistra, x piccolo
export const SETTER_RELEASE_HOME: CourtCoord = { x: 22, y: 22 };
// AWAY: rete a destra, x grande
export const SETTER_RELEASE_AWAY: CourtCoord = { x: 78, y: 78 };

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
