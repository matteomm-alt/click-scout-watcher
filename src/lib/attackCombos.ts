/**
 * Catalogo combinazioni di alzata standard DataVolley.
 * Convenzione: prima lettera identifica la famiglia (X = palla in mano allo
 * schiacciatore / chiamata standard, V = palla alta high ball, P = pipe,
 * B = back-row). Il numero indica posizione/chiamata.
 */

import type { PlayerRole } from '@/types/volleyball';

export interface AttackCombo {
  code: string;          // es. 'X1', 'PP'
  label: string;         // descrizione breve
  zone: number;          // zona di partenza palla (1-9)
  tempo: 1 | 2 | 3;      // 1=veloce / 2=medio / 3=alto
  row: 'front' | 'back'; // prima o seconda linea
  role: PlayerRole | 'ANY'; // ruolo tipico
}

export const ATTACK_COMBOS: AttackCombo[] = [
  // Primi tempi (centrale)
  { code: 'X1', label: '1° tempo avanti',       zone: 3, tempo: 1, row: 'front', role: 'M' },
  { code: 'X2', label: '1° tempo dietro',       zone: 3, tempo: 1, row: 'front', role: 'M' },
  { code: 'XF', label: 'Fast / Super avanti',   zone: 3, tempo: 1, row: 'front', role: 'M' },
  // Posto 4
  { code: 'X5', label: 'Posto 4 alto',          zone: 4, tempo: 3, row: 'front', role: 'O' },
  { code: 'X6', label: 'Super tesa P4',         zone: 4, tempo: 2, row: 'front', role: 'O' },
  // Posto 2 / opposto
  { code: 'X7', label: 'Posto 2 (opposto)',     zone: 2, tempo: 3, row: 'front', role: 'OP' },
  { code: 'X8', label: 'Tesa P2',               zone: 2, tempo: 2, row: 'front', role: 'OP' },
  // Pipe e back-row
  { code: 'PP', label: 'Pipe (P6)',             zone: 6, tempo: 2, row: 'back',  role: 'O' },
  { code: 'BC', label: 'Back-row P1',           zone: 1, tempo: 3, row: 'back',  role: 'OP' },
  { code: 'BB', label: 'Back-row P5',           zone: 5, tempo: 3, row: 'back',  role: 'O' },
  // High ball (palla scontata / staccata)
  { code: 'V5', label: 'Alta P4 (high ball)',   zone: 4, tempo: 3, row: 'front', role: 'ANY' },
  { code: 'V6', label: 'Alta P6 (high ball)',   zone: 6, tempo: 3, row: 'back',  role: 'ANY' },
  { code: 'V7', label: 'Alta P2 (high ball)',   zone: 2, tempo: 3, row: 'front', role: 'ANY' },
];

export const ATTACK_COMBO_MAP: Record<string, AttackCombo> = Object.fromEntries(
  ATTACK_COMBOS.map((c) => [c.code, c])
);

export function getComboLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return ATTACK_COMBO_MAP[code]?.label ?? code;
}

/** Filtra il catalogo in base al ruolo e alla linea del giocatore. */
export function suggestCombos(opts: {
  playerRole?: PlayerRole | null;
  isBackRow?: boolean;
}): AttackCombo[] {
  return ATTACK_COMBOS.filter((c) => {
    if (opts.isBackRow !== undefined) {
      if (opts.isBackRow && c.row === 'front') return false;
      if (!opts.isBackRow && c.row === 'back') return false;
    }
    if (opts.playerRole && c.role !== 'ANY' && c.role !== opts.playerRole) {
      // Tollera S/L/U (alzatore, libero, universale): mostrano tutto.
      if (!['S', 'L', 'U'].includes(opts.playerRole)) return false;
    }
    return true;
  });
}
