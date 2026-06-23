/**
 * Helper per le combinazioni di alzata. Si appoggia al catalogo già
 * esistente in `@/types/volleyball` (più ricco — usato anche da LiveScout
 * per calcolare gli offset dei centrali) ed espone funzioni di
 * label / suggerimento.
 */
import {
  ATTACK_COMBOS as RAW_ATTACK_COMBOS,
  type AttackCombo,
  type PlayerRole,
} from '@/types/volleyball';

export { ATTACK_COMBOS } from '@/types/volleyball';
export type { AttackCombo } from '@/types/volleyball';

export const ATTACK_COMBO_MAP: Record<string, AttackCombo> = Object.fromEntries(
  RAW_ATTACK_COMBOS.map((c) => [c.code, c]),
);

export function getComboLabel(code?: string | null): string {
  if (!code) return '—';
  const c = ATTACK_COMBO_MAP[code];
  return c ? c.description ?? c.code : code;
}

/**
 * Suggerisce le combo plausibili per il giocatore selezionato in base al ruolo
 * e alla linea (front/back row).
 */
export function suggestCombos(opts: {
  playerRole?: PlayerRole | null;
  isBackRow?: boolean;
}): AttackCombo[] {
  return RAW_ATTACK_COMBOS.filter((c) => {
    // Pipe / palla in seconda linea (position 'P') => solo back row.
    if (opts.isBackRow === true && !['P', '-'].includes(c.position)) {
      // back-row possono fare anche le high ball generiche se non sono primi tempi (Q)
      if (c.tempo === 'Q') return false;
    }
    if (opts.isBackRow === false && c.position === 'P') return false;

    // Centrali → solo veloci (Q) e simili (slide CB/CF/CD)
    if (opts.playerRole === 'M') return c.tempo === 'Q';
    // Alzatore → solo 2° tocco / freeball
    if (opts.playerRole === 'S') return ['PP', 'PR'].includes(c.code);
    // Libero → nessuna combo di attacco
    if (opts.playerRole === 'L') return false;

    // Schiacciatori / opposti / universali → escludo i primi tempi e gli slide
    if (c.tempo === 'Q') return false;
    return true;
  });
}
