/**
 * Helper di analisi su scout_actions normalizzate.
 * Calcola statistiche per skill, per giocatore, per rotazione e KPI confronto squadre.
 */

export interface DbAction {
  id: string;
  scout_match_id: string;
  scout_team_id: string;
  side: 'home' | 'away';
  set_number: number;
  rally_index: number;
  action_index: number;
  player_number: number | null;
  skill: string;
  skill_type: string | null;
  evaluation: string;
  start_zone: number | null;
  end_zone: number | null;
  end_subzone: string | null;
  attack_combo: string | null;
  home_score: number;
  away_score: number;
  home_rotation: number[] | null;
  away_rotation: number[] | null;
  home_setter_pos: number | null;
  away_setter_pos: number | null;
  serving_side: 'home' | 'away' | null;
}

/**
 * Restituisce la "rotazione" (1..6) della squadra `side` al momento dell'azione.
 * Per convenzione usiamo la posizione del setter come identificatore di rotazione:
 *   R1 = setter in P1, R2 = setter in P2, ... R6 = setter in P6.
 * Fallback: se setter_pos non disponibile, usa rotation[0] (P1) come proxy.
 */
export function rotationOf(a: DbAction, side: 'home' | 'away'): number | null {
  const pos = side === 'home' ? a.home_setter_pos : a.away_setter_pos;
  if (pos && pos >= 1 && pos <= 6) return pos;
  const rot = side === 'home' ? a.home_rotation : a.away_rotation;
  if (rot && rot.length === 6 && rot[0]) return ((rot[0] - 1) % 6) + 1;
  return null;
}

/**
 * Fase di gioco rispetto a una squadra:
 *   K1 (sideout / cambio palla) = la squadra è in ricezione (l'avversario serve)
 *   K2 (break point)            = la squadra è in battuta
 */
export type Phase = 'K1' | 'K2';
export function phaseOf(a: DbAction, side: 'home' | 'away'): Phase | null {
  if (!a.serving_side) return null;
  return a.serving_side === side ? 'K2' : 'K1';
}

export const SKILL_NAMES: Record<string, string> = {
  S: 'Battuta',
  R: 'Ricezione',
  A: 'Attacco',
  B: 'Muro',
  D: 'Difesa',
  E: 'Alzata',
  F: 'Free ball',
};

export const EVAL_NAMES: Record<string, string> = {
  '#': 'Perfetto',
  '+': 'Positivo',
  '!': 'OK',
  '-': 'Scarso',
  '/': 'Errato',
  '=': 'Errore',
};

export const EVAL_COLORS: Record<string, string> = {
  '#': 'hsl(var(--success))',
  '+': 'hsl(142 70% 50%)',
  '!': 'hsl(var(--muted-foreground))',
  '-': 'hsl(var(--warning))',
  '/': 'hsl(25 90% 55%)',
  '=': 'hsl(var(--destructive))',
};

/* -------------------- Aggregazioni base -------------------- */

export interface SkillStats {
  skill: string;
  total: number;
  perfect: number;   // #
  positive: number;  // # + +
  errors: number;    // = + /
  efficiency: number; // (perfect - errors) / total
  positivePct: number;
  errorPct: number;
}

export function statsBySkill(actions: DbAction[]): SkillStats[] {
  const map = new Map<string, SkillStats>();
  for (const a of actions) {
    let s = map.get(a.skill);
    if (!s) {
      s = { skill: a.skill, total: 0, perfect: 0, positive: 0, errors: 0, efficiency: 0, positivePct: 0, errorPct: 0 };
      map.set(a.skill, s);
    }
    s.total++;
    if (a.evaluation === '#') { s.perfect++; s.positive++; }
    else if (a.evaluation === '+') { s.positive++; }
    else if (a.evaluation === '=' || a.evaluation === '/') { s.errors++; }
  }
  for (const s of map.values()) {
    s.efficiency = s.total ? ((s.perfect - s.errors) / s.total) * 100 : 0;
    s.positivePct = s.total ? (s.positive / s.total) * 100 : 0;
    s.errorPct = s.total ? (s.errors / s.total) * 100 : 0;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/* -------------------- Statistiche per giocatore -------------------- */

export interface PlayerStats {
  number: number;
  total: number;
  bySkill: Record<string, SkillStats>;
}

export function statsByPlayer(actions: DbAction[]): PlayerStats[] {
  const byNum = new Map<number, DbAction[]>();
  for (const a of actions) {
    if (a.player_number === null) continue;
    if (!byNum.has(a.player_number)) byNum.set(a.player_number, []);
    byNum.get(a.player_number)!.push(a);
  }
  const out: PlayerStats[] = [];
  for (const [number, acts] of byNum.entries()) {
    const bySkill: Record<string, SkillStats> = {};
    for (const s of statsBySkill(acts)) bySkill[s.skill] = s;
    out.push({ number, total: acts.length, bySkill });
  }
  return out.sort((a, b) => b.total - a.total);
}

/* -------------------- Heatmap zone -------------------- */

export interface ZoneCell {
  zone: number;
  total: number;
  perfect: number;
  errors: number;
  efficiency: number;
}

export function zoneStats(actions: DbAction[], which: 'start' | 'end'): ZoneCell[] {
  const map = new Map<number, ZoneCell>();
  for (let z = 1; z <= 9; z++) {
    map.set(z, { zone: z, total: 0, perfect: 0, errors: 0, efficiency: 0 });
  }
  for (const a of actions) {
    const z = which === 'start' ? a.start_zone : a.end_zone;
    if (!z || z < 1 || z > 9) continue;
    const cell = map.get(z)!;
    cell.total++;
    if (a.evaluation === '#') cell.perfect++;
    if (a.evaluation === '=' || a.evaluation === '/') cell.errors++;
  }
  for (const c of map.values()) {
    c.efficiency = c.total ? ((c.perfect - c.errors) / c.total) * 100 : 0;
  }
  return [...map.values()];
}

/* -------------------- Rotazioni: side-out & point-win % -------------------- */

/**
 * Una rotazione del DataVolley è identificata dalla posizione del setter (P1..P6).
 * Convenzione: P1 = setter in zona 1 (in fondo a destra). P5 = setter in zona 5.
 *
 * Side-out% = punti vinti in ricezione / palle giocate in ricezione.
 * Point-win% = punti vinti in battuta / palle giocate in battuta.
 *
 * Calcoliamo aggregando per rally_index e prendendo l'ultima azione vincente del rally.
 */

export interface RotationStats {
  setterPos: number; // 1..6
  rallies: number;
  pointsWon: number;
  // separati per ricezione/battuta
  receptionRallies: number;
  receptionWon: number;
  serveRallies: number;
  serveWon: number;
  sideOutPct: number;
  pointWinPct: number;
}

export function rotationStats(actions: DbAction[], teamId: string, opts: { side: 'home' | 'away' }): RotationStats[] {
  const init = (): RotationStats => ({
    setterPos: 0, rallies: 0, pointsWon: 0,
    receptionRallies: 0, receptionWon: 0, serveRallies: 0, serveWon: 0,
    sideOutPct: 0, pointWinPct: 0,
  });
  const map = new Map<number, RotationStats>();
  for (let p = 1; p <= 6; p++) map.set(p, { ...init(), setterPos: p });

  // raggruppo azioni per (set_number, rally_index)
  const rallies = new Map<string, DbAction[]>();
  for (const a of actions) {
    if (a.scout_team_id !== teamId) {
      // includo anche le azioni avversarie per vedere chi ha vinto, ma le aggrego per il rally
    }
    const k = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(k)) rallies.set(k, []);
    rallies.get(k)!.push(a);
  }

  for (const [, rally] of rallies) {
    if (rally.length === 0) continue;
    const myActions = rally.filter(a => a.scout_team_id === teamId);
    if (myActions.length === 0) continue;
    const first = myActions[0];

    // Rotazione = posizione del setter di QUESTA squadra in questo rally.
    const bucket = rotationOf(first, opts.side);
    if (!bucket) continue;

    const servingSide = first.serving_side;
    if (!servingSide) continue;

    // Determina vincitore del rally
    let winner: 'home' | 'away' | null = null;
    for (let i = rally.length - 1; i >= 0; i--) {
      const a = rally[i];
      if (a.evaluation === '#') {
        if (a.skill === 'A' || a.skill === 'B' || a.skill === 'S') winner = a.side;
        else if (a.skill === 'E' && (a.skill_type === 'T' || a.skill_type === 'H')) winner = a.side;
        if (winner) break;
      }
      if (a.evaluation === '=' || a.evaluation === '/') {
        winner = a.side === 'home' ? 'away' : 'home';
        break;
      }
    }
    if (!winner) {
      const last = rally[rally.length - 1];
      winner = last.home_score > last.away_score ? 'home' : 'away';
    }

    const rs = map.get(bucket)!;
    rs.rallies++;
    const won = winner === opts.side;
    if (won) rs.pointsWon++;
    if (servingSide === opts.side) {
      rs.serveRallies++;
      if (won) rs.serveWon++;
    } else {
      rs.receptionRallies++;
      if (won) rs.receptionWon++;
    }
  }

  for (const r of map.values()) {
    r.sideOutPct = r.receptionRallies ? (r.receptionWon / r.receptionRallies) * 100 : 0;
    r.pointWinPct = r.serveRallies ? (r.serveWon / r.serveRallies) * 100 : 0;
  }
  return [...map.values()];
}

/* -------------------- Andamento set: serie temporale punto-punto -------------------- */

export interface SetTimeline {
  setNumber: number;
  points: { home: number; away: number; lead: number }[]; // lead = home - away
}

export function setsTimeline(actions: DbAction[]): SetTimeline[] {
  const bySet = new Map<number, DbAction[]>();
  for (const a of actions) {
    if (!bySet.has(a.set_number)) bySet.set(a.set_number, []);
    bySet.get(a.set_number)!.push(a);
  }
  const out: SetTimeline[] = [];
  for (const [setNumber, list] of [...bySet.entries()].sort((a, b) => a[0] - b[0])) {
    const points: { home: number; away: number; lead: number }[] = [{ home: 0, away: 0, lead: 0 }];
    let lastH = 0, lastA = 0;
    for (const a of list) {
      if (a.home_score !== lastH || a.away_score !== lastA) {
        points.push({ home: a.home_score, away: a.away_score, lead: a.home_score - a.away_score });
        lastH = a.home_score; lastA = a.away_score;
      }
    }
    out.push({ setNumber, points });
  }
  return out;
}
