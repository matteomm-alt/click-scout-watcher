/**
 * Pattern e tendenze (Fase 2 del piano analisi DVW).
 *
 * Funzioni focalizzate sull'AVVERSARIO della squadra attiva:
 *  - distribuzione attacco condizionata a (rotazione, qualità ricezione)
 *  - mappa battuta nostra → ricevitore avversario (qualità ricezione media)
 *  - catene perdenti: sequenze di azioni che terminano in break dell'avversario
 *
 * Tutte le funzioni ricevono `allActions` (entrambe le squadre) e l'id della
 * squadra "nostra" per orientare il calcolo.
 */

import { rotationOf, type DbAction } from './scoutAnalysis';

// piccolo helper inline per evitare un import circolare con scoutPlayerAdvanced
const RX_W: Record<string, number> = { '#': 1.0, '+': 0.8, '!': 0.5, '-': 0.2, '/': 0.0, '=': 0.0 };

/* ============================================================
   1) Distribuzione attacco avversario per (rotazione, ricezione)
   ============================================================ */

export interface OppAttackDistributionRow {
  rotation: number;           // 1..6 — posizione setter avversario
  receptionQuality: string;   // '#' | '+' | '!' | '-' | '/' | '=' | 'NA'
  zoneCounts: Record<number, number>; // zone 1..9 → attacchi
  total: number;
  kills: number;
  errors: number;
  efficiency: number;
  topZone: number | null;     // zona più attaccata
  topZonePct: number;         // % attacchi su topZone
}

/**
 * Per ciascun rally in cui l'avversario attacca, classifichiamo:
 *  - la sua rotazione (setterPos)
 *  - la qualità della sua ricezione nel rally (prima R nello stesso rally)
 *  - la zona d'attacco (start_zone)
 *
 * Aggregiamo (rotation, qualityClass) → distribuzione zone.
 */
export function opponentAttackDistribution(
  allActions: DbAction[],
  myTeamId: string,
): OppAttackDistributionRow[] {
  const oppSide = (a: DbAction): 'home' | 'away' => (a.scout_team_id === myTeamId ? (a.side === 'home' ? 'away' : 'home') : a.side);

  // ricezione avversario per rally
  const oppRecByRally = new Map<string, DbAction>();
  for (const a of allActions) {
    if (a.skill !== 'R' || a.scout_team_id === myTeamId) continue;
    const k = `${a.set_number}-${a.rally_index}`;
    if (!oppRecByRally.has(k)) oppRecByRally.set(k, a);
  }

  const map = new Map<string, OppAttackDistributionRow>();
  for (const a of allActions) {
    if (a.skill !== 'A' || a.scout_team_id === myTeamId) continue;
    const side = a.side;
    const rot = rotationOf(a, side);
    if (!rot) continue;
    const k = `${a.set_number}-${a.rally_index}`;
    const rec = oppRecByRally.get(k);
    const q = rec ? rec.evaluation : 'NA';
    const key = `${rot}-${q}`;
    let row = map.get(key);
    if (!row) {
      row = {
        rotation: rot, receptionQuality: q, zoneCounts: {},
        total: 0, kills: 0, errors: 0, efficiency: 0, topZone: null, topZonePct: 0,
      };
      map.set(key, row);
    }
    const z = a.start_zone ?? 0;
    if (z >= 1 && z <= 9) row.zoneCounts[z] = (row.zoneCounts[z] || 0) + 1;
    row.total++;
    if (a.evaluation === '#') row.kills++;
    else if (a.evaluation === '=' || a.evaluation === '/') row.errors++;
  }

  for (const r of map.values()) {
    r.efficiency = r.total ? ((r.kills - r.errors) / r.total) * 100 : 0;
    let topZ: number | null = null, topC = 0;
    for (const [z, c] of Object.entries(r.zoneCounts)) {
      if (c > topC) { topC = c; topZ = Number(z); }
    }
    r.topZone = topZ;
    r.topZonePct = r.total ? (topC / r.total) * 100 : 0;
  }

  return [...map.values()].sort((a, b) =>
    a.rotation - b.rotation || b.total - a.total
  );
}

/* ============================================================
   2) Battuta nostra → ricevitore avversario (xP medio)
   ============================================================ */

export interface ServeReceiverRow {
  receiverNumber: number;
  receptions: number;
  perfect: number;
  positive: number;
  errors: number;
  xpAverage: number;          // qualità media (0..1)
  positivePct: number;
  errorPct: number;
}

export function serveTargetReceivers(
  allActions: DbAction[],
  myTeamId: string,
): ServeReceiverRow[] {
  // ricezione avversario per rally
  const map = new Map<number, ServeReceiverRow>();
  for (const a of allActions) {
    if (a.skill !== 'R' || a.scout_team_id === myTeamId) continue;
    if (a.player_number === null) continue;
    let row = map.get(a.player_number);
    if (!row) {
      row = {
        receiverNumber: a.player_number, receptions: 0, perfect: 0, positive: 0,
        errors: 0, xpAverage: 0, positivePct: 0, errorPct: 0,
      };
      map.set(a.player_number, row);
    }
    row.receptions++;
    if (a.evaluation === '#') { row.perfect++; row.positive++; }
    else if (a.evaluation === '+') { row.positive++; }
    else if (a.evaluation === '=' || a.evaluation === '/') { row.errors++; }
    row.xpAverage += RX_W[a.evaluation] ?? 0;
  }
  for (const r of map.values()) {
    r.xpAverage = r.receptions ? r.xpAverage / r.receptions : 0;
    r.positivePct = r.receptions ? (r.positive / r.receptions) * 100 : 0;
    r.errorPct = r.receptions ? (r.errors / r.receptions) * 100 : 0;
  }
  return [...map.values()].sort((a, b) => a.xpAverage - b.xpAverage); // ordinati per più "pressati"
}

/* ============================================================
   3) Catene perdenti — sequenze di N azioni che chiudono in break avversario
   ============================================================ */

export interface LosingChainRow {
  signature: string;          // es. "R= → A_no"
  occurrences: number;
  examples: string[];         // descrizioni "Set X · Rally Y"
}

/**
 * Identifica le ultime `chainLength` azioni di ogni rally perso dalla nostra
 * squadra mentre eravamo in ricezione (= break point per l'avversario).
 * Genera una "firma" del pattern e conta le occorrenze.
 */
export function losingBreakChains(
  allActions: DbAction[],
  myTeamId: string,
  chainLength = 3,
): LosingChainRow[] {
  // raggruppo per (set, rally)
  const rallies = new Map<string, DbAction[]>();
  for (const a of allActions) {
    const k = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(k)) rallies.set(k, []);
    rallies.get(k)!.push(a);
  }

  // mySide
  const anyMy = allActions.find(a => a.scout_team_id === myTeamId);
  if (!anyMy) return [];
  const mySide: 'home' | 'away' = anyMy.side;

  const sigMap = new Map<string, LosingChainRow>();

  for (const [key, rally] of rallies) {
    rally.sort((a, b) => a.action_index - b.action_index);
    const first = rally[0];
    if (!first.serving_side) continue;
    // ci interessano solo i rally in cui l'AVVERSARIO ha battuto (= noi in K1)
    if (first.serving_side === mySide) continue;

    // vincitore
    let winner: 'home' | 'away' | null = null;
    for (let i = rally.length - 1; i >= 0; i--) {
      const a = rally[i];
      if (a.evaluation === '#' && (a.skill === 'A' || a.skill === 'B' || a.skill === 'S')) {
        winner = a.side; break;
      }
      if (a.evaluation === '=' || a.evaluation === '/') {
        winner = a.side === 'home' ? 'away' : 'home'; break;
      }
    }
    if (winner !== (mySide === 'home' ? 'away' : 'home')) continue;
    // se non abbiamo perso, skip
    if (winner === mySide) continue;

    // firma: ultime N azioni nostre+loro (sigla compatta)
    const lastN = rally.slice(-chainLength);
    if (lastN.length === 0) continue;
    const sig = lastN.map(a => {
      const who = a.scout_team_id === myTeamId ? 'N' : 'O';
      return `${who}:${a.skill}${a.evaluation}`;
    }).join(' → ');

    let row = sigMap.get(sig);
    if (!row) { row = { signature: sig, occurrences: 0, examples: [] }; sigMap.set(sig, row); }
    row.occurrences++;
    if (row.examples.length < 3) {
      const [s, r] = key.split('-');
      row.examples.push(`Set ${s} · Rally ${r}`);
    }
  }

  return [...sigMap.values()]
    .filter(r => r.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 20);
}
