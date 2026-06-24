import { supabase } from '@/integrations/supabase/client';
import type { MatchState, MatchInfo, Team, ScoutAction } from '@/types/volleyball';

/**
 * Persistenza live-scout su Supabase.
 *
 * Responsabilità:
 *  1. risolvere/creare le righe `scout_teams` per home/away (per coach_id),
 *  2. creare la riga `scout_matches` UNA SOLA VOLTA per sessione (upsert id),
 *  3. inserire incrementalmente le nuove azioni in `scout_actions`,
 *     senza re-inviare quelle gia' salvate.
 *
 * Tutto best-effort: gli errori sono loggati, mai rilanciati, cosi' lo scout
 * resta utilizzabile offline. Lo stato di "cosa abbiamo gia' inviato" e' in
 * memoria per sessione (mappa per sessionId), quindi un refresh ricrea il
 * record di match e re-invia le azioni del journal locale — l'upsert per id
 * sul match e l'idempotenza per (scout_match_id,set,rally,action) impedisce
 * duplicati lato server.
 */

interface SessionCache {
  homeTeamId: string;
  awayTeamId: string;
  matchEnsured: boolean;
  sentActionIds: Set<string>;
}

const sessionCache = new Map<string, SessionCache>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

async function resolveTeamId(coachId: string, name: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const sb = supabase as unknown as SbAny;
  try {
    const { data: existing } = await sb.from('scout_teams').select('id')
      .eq('coach_id', coachId).ilike('name', name.trim()).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await sb.from('scout_teams')
      .insert({ coach_id: coachId, name: name.trim(), is_own_team: false })
      .select('id').single();
    if (error || !created?.id) {
      console.warn('[scoutPersistence] team create failed', name, error);
      return null;
    }
    return created.id;
  } catch (e) {
    console.warn('[scoutPersistence] resolveTeamId failed', e);
    return null;
  }
}

async function ensureSession(
  sessionId: string,
  userId: string,
  matchInfo: MatchInfo,
  homeTeam: Team,
  awayTeam: Team,
): Promise<SessionCache | null> {
  const cached = sessionCache.get(sessionId);
  if (cached?.matchEnsured) return cached;

  const homeTeamId = cached?.homeTeamId
    ?? await resolveTeamId(userId, homeTeam.name || 'Squadra Casa');
  const awayTeamId = cached?.awayTeamId
    ?? await resolveTeamId(userId, awayTeam.name || 'Squadra Ospite');
  if (!homeTeamId || !awayTeamId) return null;

  const entry: SessionCache = {
    homeTeamId,
    awayTeamId,
    matchEnsured: false,
    sentActionIds: cached?.sentActionIds ?? new Set<string>(),
  };
  sessionCache.set(sessionId, entry);
  return entry;
}

/**
 * Upsert della riga `scout_matches` per la sessione + insert incrementale
 * delle nuove `scout_actions`. Da chiamare periodicamente durante lo scout
 * live (es. ogni N azioni o a fine set).
 */
export async function upsertScoutSession(
  sessionId: string,
  userId: string,
  matchInfo: MatchInfo,
  homeTeam: Team,
  awayTeam: Team,
  matchState: MatchState,
): Promise<void> {
  try {
    const sess = await ensureSession(sessionId, userId, matchInfo, homeTeam, awayTeam);
    if (!sess) return;
    const sb = supabase as unknown as SbAny;

    const { error: matchErr } = await sb.from('scout_matches').upsert({
      id: sessionId,
      coach_id: userId,
      home_team_id: sess.homeTeamId,
      away_team_id: sess.awayTeamId,
      match_date: matchInfo.date || null,
      match_time: matchInfo.time || null,
      season: matchInfo.season || null,
      league: matchInfo.league || null,
      phase: matchInfo.phase || null,
      venue: matchInfo.venue || null,
      city: matchInfo.city || null,
      home_sets_won: matchState.homeSetsWon,
      away_sets_won: matchState.awaySetsWon,
      set_results: matchState.setResults,
    }, { onConflict: 'id' });
    if (matchErr) {
      console.warn('[scoutPersistence] match upsert failed', matchErr);
      return;
    }
    sess.matchEnsured = true;

    // Calcola rally_index/action_index per ogni azione, raggruppando per set.
    const rows: Record<string, unknown>[] = [];
    type Counter = { rallyByKey: Map<string, number>; nextRally: number; actionByRally: Map<string, number> };
    const perSet = new Map<number, Counter>();

    for (const a of matchState.actions) {
      const c = perSet.get(a.setNumber) ?? { rallyByKey: new Map(), nextRally: 0, actionByRally: new Map() };
      const rallyKey = a.rallyId ?? `${a.setNumber}-${a.homeScore}-${a.awayScore}`;
      let rallyIndex = c.rallyByKey.get(rallyKey);
      if (rallyIndex === undefined) {
        rallyIndex = c.nextRally++;
        c.rallyByKey.set(rallyKey, rallyIndex);
      }
      const actionIndex = (c.actionByRally.get(rallyKey) ?? 0);
      c.actionByRally.set(rallyKey, actionIndex + 1);
      perSet.set(a.setNumber, c);

      if (sess.sentActionIds.has(a.id)) continue;

      rows.push(buildActionRow(sessionId, sess, a, rallyIndex, actionIndex));
    }

    if (rows.length === 0) return;

    // Batch insert (RLS verifica match->coach_id).
    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH).map(({ _localId, ...rest }) => rest);
      const { error } = await sb.from('scout_actions').insert(slice);
      if (error) {
        console.warn('[scoutPersistence] actions insert failed', error);
        return; // non marcare come inviate, riproveremo al prossimo flush
      }
    }
    for (const r of rows) {
      const id = r._localId as string;
      sess.sentActionIds.add(id);
    }
  } catch (err) {
    console.warn('[scoutPersistence] save failed:', err);
  }
}

function buildActionRow(
  sessionId: string,
  sess: SessionCache,
  a: ScoutAction,
  rallyIndex: number,
  actionIndex: number,
): Record<string, unknown> {
  return {
    _localId: a.id, // stripped before insert
    scout_match_id: sessionId,
    scout_team_id: a.team === 'home' ? sess.homeTeamId : sess.awayTeamId,
    side: a.team,
    set_number: a.setNumber,
    rally_index: rallyIndex,
    action_index: actionIndex,
    player_number: a.playerNumber,
    skill: a.skill,
    skill_type: a.skillType,
    evaluation: a.evaluation,
    start_zone: a.startZone ?? null,
    end_zone: a.endZone ?? null,
    landing_zone: a.landingZone ?? null,
    attack_combo: a.attackCode ?? null,
    home_score: a.homeScore,
    away_score: a.awayScore,
    home_setter_pos: a.homeSetterPosition,
    away_setter_pos: a.awaySetterPosition,
    home_rotation: a.homeLineup,
    away_rotation: a.awayLineup,
    serving_side: a.servingTeam ?? null,
    raw_code: a.code,
    timestamp_clock: a.timestamp,
  };
}

/** Resetta la cache di sessione (es. dopo resetMatch o cambio match). */
export function clearScoutSessionCache(sessionId?: string): void {
  if (sessionId) sessionCache.delete(sessionId);
  else sessionCache.clear();
}
