/**
 * KPI avanzati per giocatore (Fase 1 del piano analisi DVW).
 *
 * Tutte le funzioni qui dentro lavorano su `DbAction[]` già filtrate per squadra
 * (per attacco/ricezione/battuta dei propri giocatori) e/o complete (per indici
 * che richiedono la valutazione dell'avversario, come Serve Pressure).
 */

import type { DbAction, Phase } from './scoutAnalysis';
import { phaseOf } from './scoutAnalysis';

/* -------------------- Attack K1 / K2 -------------------- */

export interface AttackPhaseStats {
  phase: Phase;
  total: number;
  kills: number;
  errors: number;
  positive: number;
  killPct: number;
  errorPct: number;
  efficiency: number;
}

export interface PlayerAttackByPhase {
  number: number;
  K1: AttackPhaseStats;
  K2: AttackPhaseStats;
  total: number;
}

const emptyAttackPhase = (phase: Phase): AttackPhaseStats => ({
  phase, total: 0, kills: 0, errors: 0, positive: 0,
  killPct: 0, errorPct: 0, efficiency: 0,
});

function finalize(s: AttackPhaseStats) {
  s.killPct = s.total ? (s.kills / s.total) * 100 : 0;
  s.errorPct = s.total ? (s.errors / s.total) * 100 : 0;
  s.efficiency = s.total ? ((s.kills - s.errors) / s.total) * 100 : 0;
}

export function attackByPhasePerPlayer(
  teamActions: DbAction[],
  side: 'home' | 'away',
): PlayerAttackByPhase[] {
  const map = new Map<number, PlayerAttackByPhase>();
  for (const a of teamActions) {
    if (a.skill !== 'A' || a.player_number === null) continue;
    const ph = phaseOf(a, side);
    if (!ph) continue;
    let p = map.get(a.player_number);
    if (!p) {
      p = { number: a.player_number, K1: emptyAttackPhase('K1'), K2: emptyAttackPhase('K2'), total: 0 };
      map.set(a.player_number, p);
    }
    const slot = p[ph];
    slot.total++;
    p.total++;
    if (a.evaluation === '#') { slot.kills++; slot.positive++; }
    else if (a.evaluation === '+') { slot.positive++; }
    else if (a.evaluation === '=' || a.evaluation === '/') { slot.errors++; }
  }
  for (const p of map.values()) { finalize(p.K1); finalize(p.K2); }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/* -------------------- Attack per zona di alzata / tempo -------------------- */

/**
 * Mappa skill_type di DataVolley → etichetta di tempo.
 * Lasciamo passare codici sconosciuti per non perdere dati.
 */
export const ATTACK_TEMPO_LABEL: Record<string, string> = {
  H: 'Alta',
  M: 'Media',
  Q: 'Veloce',
  T: 'Tesa',
  U: 'Super',
  F: 'Fast',
  O: 'Other',
  N: 'Slide',
  P: 'Pipe',
};

export interface AttackByZoneRow {
  zone: number;            // start_zone dell'attacco (zona da cui parte la palla attaccata)
  total: number;
  kills: number;
  errors: number;
  efficiency: number;
  killPct: number;
}

export interface AttackByTempoRow {
  tempo: string;           // codice grezzo (H/M/Q/T/U/F/N/P/O/...)
  label: string;
  total: number;
  kills: number;
  errors: number;
  efficiency: number;
  killPct: number;
}

export interface PlayerAttackBreakdown {
  number: number;
  total: number;
  byZone: AttackByZoneRow[];
  byTempo: AttackByTempoRow[];
}

export function attackBreakdownPerPlayer(teamActions: DbAction[]): PlayerAttackBreakdown[] {
  const byPlayer = new Map<number, DbAction[]>();
  for (const a of teamActions) {
    if (a.skill !== 'A' || a.player_number === null) continue;
    if (!byPlayer.has(a.player_number)) byPlayer.set(a.player_number, []);
    byPlayer.get(a.player_number)!.push(a);
  }

  const out: PlayerAttackBreakdown[] = [];
  for (const [number, list] of byPlayer.entries()) {
    const zoneMap = new Map<number, AttackByZoneRow>();
    const tempoMap = new Map<string, AttackByTempoRow>();
    for (const a of list) {
      const z = a.start_zone ?? 0;
      if (z >= 1 && z <= 9) {
        let row = zoneMap.get(z);
        if (!row) { row = { zone: z, total: 0, kills: 0, errors: 0, efficiency: 0, killPct: 0 }; zoneMap.set(z, row); }
        row.total++;
        if (a.evaluation === '#') row.kills++;
        else if (a.evaluation === '=' || a.evaluation === '/') row.errors++;
      }
      const t = a.skill_type;
      if (t) {
        let row = tempoMap.get(t);
        if (!row) {
          row = { tempo: t, label: ATTACK_TEMPO_LABEL[t] || t, total: 0, kills: 0, errors: 0, efficiency: 0, killPct: 0 };
          tempoMap.set(t, row);
        }
        row.total++;
        if (a.evaluation === '#') row.kills++;
        else if (a.evaluation === '=' || a.evaluation === '/') row.errors++;
      }
    }
    const byZone = [...zoneMap.values()].map(r => ({
      ...r,
      efficiency: r.total ? ((r.kills - r.errors) / r.total) * 100 : 0,
      killPct: r.total ? (r.kills / r.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
    const byTempo = [...tempoMap.values()].map(r => ({
      ...r,
      efficiency: r.total ? ((r.kills - r.errors) / r.total) * 100 : 0,
      killPct: r.total ? (r.kills / r.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
    out.push({ number, total: list.length, byZone, byTempo });
  }
  return out.sort((a, b) => b.total - a.total);
}

/* -------------------- Expected Points su Ricezione -------------------- */

/**
 * Pesi standard sulla qualità di ricezione (frazione di azione che porta a punto).
 */
export const RECEPTION_WEIGHTS: Record<string, number> = {
  '#': 1.0,
  '+': 0.8,
  '!': 0.5,
  '-': 0.2,
  '/': 0.0,
  '=': 0.0,
};

export interface ReceptionXPRow {
  number: number;
  receptions: number;
  perfect: number;
  positive: number;          // # + +
  errors: number;            // / + =
  xpTotal: number;           // somma pesi
  xpAverage: number;         // xpTotal / receptions
  positivePct: number;
  perfectPct: number;
  errorPct: number;
}

export function receptionExpectedPointsPerPlayer(teamActions: DbAction[]): ReceptionXPRow[] {
  const map = new Map<number, ReceptionXPRow>();
  for (const a of teamActions) {
    if (a.skill !== 'R' || a.player_number === null) continue;
    let row = map.get(a.player_number);
    if (!row) {
      row = {
        number: a.player_number, receptions: 0, perfect: 0, positive: 0, errors: 0,
        xpTotal: 0, xpAverage: 0, positivePct: 0, perfectPct: 0, errorPct: 0,
      };
      map.set(a.player_number, row);
    }
    row.receptions++;
    row.xpTotal += RECEPTION_WEIGHTS[a.evaluation] ?? 0;
    if (a.evaluation === '#') { row.perfect++; row.positive++; }
    else if (a.evaluation === '+') { row.positive++; }
    else if (a.evaluation === '=' || a.evaluation === '/') { row.errors++; }
  }
  for (const r of map.values()) {
    r.xpAverage = r.receptions ? r.xpTotal / r.receptions : 0;
    r.positivePct = r.receptions ? (r.positive / r.receptions) * 100 : 0;
    r.perfectPct = r.receptions ? (r.perfect / r.receptions) * 100 : 0;
    r.errorPct = r.receptions ? (r.errors / r.receptions) * 100 : 0;
  }
  return [...map.values()].sort((a, b) => b.xpAverage - a.xpAverage);
}

/* -------------------- Serve Pressure Index -------------------- */

/**
 * % di ricezioni avversarie ≤ R! (cioè !, -, /, =) generate dalle proprie battute.
 *
 * Per ogni battuta di un nostro giocatore guardiamo la ricezione associata
 * nello stesso rally (la prima azione R della squadra avversaria nello stesso
 * set+rally). Una battuta è "pressante" se la ricezione che ne deriva è
 * R!, R-, R/ o R=. Le R# e R+ contano come ricezione comoda.
 *
 * Inoltre tracciamo gli ace (# sulla battuta) e gli errori battuta (=, /).
 */
export interface ServePressureRow {
  number: number;
  serves: number;
  aces: number;
  errors: number;
  receptionsForced: number;     // ricezioni avversarie associate effettivamente trovate
  pressureServes: number;       // di cui hanno generato R ≤ !
  pressurePct: number;
  acePct: number;
  errorPct: number;
}

export function servePressureIndexPerPlayer(
  allActions: DbAction[],
  myTeamId: string,
): ServePressureRow[] {
  // indicizziamo le ricezioni dell'avversario per (set, rally) → primo R
  const oppReceptionByRally = new Map<string, DbAction>();
  for (const a of allActions) {
    if (a.skill !== 'R') continue;
    if (a.scout_team_id === myTeamId) continue;
    const k = `${a.set_number}-${a.rally_index}`;
    if (!oppReceptionByRally.has(k)) oppReceptionByRally.set(k, a);
  }

  const map = new Map<number, ServePressureRow>();
  for (const a of allActions) {
    if (a.skill !== 'S') continue;
    if (a.scout_team_id !== myTeamId) continue;
    if (a.player_number === null) continue;

    let row = map.get(a.player_number);
    if (!row) {
      row = {
        number: a.player_number, serves: 0, aces: 0, errors: 0,
        receptionsForced: 0, pressureServes: 0, pressurePct: 0, acePct: 0, errorPct: 0,
      };
      map.set(a.player_number, row);
    }
    row.serves++;
    if (a.evaluation === '#') row.aces++;
    else if (a.evaluation === '=' || a.evaluation === '/') row.errors++;

    const k = `${a.set_number}-${a.rally_index}`;
    const rec = oppReceptionByRally.get(k);
    if (rec) {
      row.receptionsForced++;
      if (rec.evaluation === '!' || rec.evaluation === '-' || rec.evaluation === '/' || rec.evaluation === '=') {
        row.pressureServes++;
      }
    }
  }
  for (const r of map.values()) {
    r.pressurePct = r.receptionsForced ? (r.pressureServes / r.receptionsForced) * 100 : 0;
    r.acePct = r.serves ? (r.aces / r.serves) * 100 : 0;
    r.errorPct = r.serves ? (r.errors / r.serves) * 100 : 0;
  }
  return [...map.values()].sort((a, b) => b.pressurePct - a.pressurePct);
}
