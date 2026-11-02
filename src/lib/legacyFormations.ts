/**
 * Default delle tabelle attacco/difesa usati dalle versioni precedenti dell'app.
 * Servono solo alla migrazione del salvataggio locale: se le tabelle salvate sono
 * ancora identiche a questi valori (mai personalizzate) vengono sostituite coi
 * nuovi default; quelle modificate dal tecnico non vengono toccate.
 */
import type { ReceptionFormations } from './receptionFormations';

const same = (v: ReceptionFormations['1']): ReceptionFormations =>
  ({ 1: v, 2: v, 3: v, 4: v, 5: v, 6: v });

/** Difesa v0: coordinate in stile campo (ruotate male). */
export const LEGACY_DEFENSE_V0: ReceptionFormations = same({
  1: { x: 75, y: 50 }, 2: { x: 20, y: 20 }, 3: { x: 20, y: 50 },
  4: { x: 20, y: 80 }, 5: { x: 65, y: 80 }, 6: { x: 65, y: 20 },
});

/** Difesa v1: coordinate canoniche ma P1 al centro e P6 a destra. */
export const LEGACY_DEFENSE_V1: ReceptionFormations = same({
  1: { x: 50, y: 75 }, 2: { x: 80, y: 20 }, 3: { x: 50, y: 20 },
  4: { x: 20, y: 20 }, 5: { x: 20, y: 65 }, 6: { x: 80, y: 65 },
});

/** Attacco fino alla v1. */
export const LEGACY_ATTACK_V1: ReceptionFormations = {
  1: { 1: { x: 78, y: 12 }, 2: { x: 50, y: 40 }, 3: { x: 50, y: 8 }, 4: { x: 16, y: 12 }, 5: { x: 16, y: 20 }, 6: { x: 50, y: 72 } },
  2: { 1: { x: 50, y: 40 }, 2: { x: 78, y: 12 }, 3: { x: 50, y: 8 }, 4: { x: 16, y: 12 }, 5: { x: 20, y: 14 }, 6: { x: 50, y: 72 } },
  3: { 1: { x: 50, y: 40 }, 2: { x: 78, y: 14 }, 3: { x: 65, y: 10 }, 4: { x: 16, y: 12 }, 5: { x: 18, y: 22 }, 6: { x: 50, y: 72 } },
  4: { 1: { x: 50, y: 40 }, 2: { x: 78, y: 14 }, 3: { x: 50, y: 8 }, 4: { x: 68, y: 10 }, 5: { x: 18, y: 22 }, 6: { x: 50, y: 72 } },
  5: { 1: { x: 50, y: 40 }, 2: { x: 16, y: 14 }, 3: { x: 50, y: 8 }, 4: { x: 16, y: 18 }, 5: { x: 68, y: 10 }, 6: { x: 50, y: 72 } },
  6: { 1: { x: 78, y: 40 }, 2: { x: 50, y: 8 }, 3: { x: 50, y: 10 }, 4: { x: 16, y: 14 }, 5: { x: 18, y: 22 }, 6: { x: 68, y: 10 } },
};
