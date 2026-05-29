import { supabase } from '@/integrations/supabase/client';
import type { MatchState, MatchInfo, Team } from '@/types/volleyball';

/**
 * Salva/aggiorna una sessione di scout su Supabase.
 * Idempotente: usa lo stesso sessionId per upsert.
 * Errori loggati ma non rilanciati (lo scout deve restare offline-friendly).
 */
export async function upsertScoutSession(
  sessionId: string,
  userId: string,
  matchInfo: MatchInfo,
  _homeTeam: Team,
  _awayTeam: Team,
  matchState: MatchState,
): Promise<void> {
  try {
    await (supabase as unknown as {
      from: (t: string) => { upsert: (v: Record<string, unknown>, o?: { onConflict?: string }) => Promise<{ error: unknown }> };
    })
      .from('scout_matches')
      .upsert({
        id: sessionId,
        coach_id: userId,
        match_date: matchInfo.date || null,
        league: matchInfo.league || null,
        venue: matchInfo.venue || null,
        home_sets_won: matchState.homeSetsWon,
        away_sets_won: matchState.awaySetsWon,
        set_results: matchState.setResults,
      }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[scoutPersistence] save failed:', err);
  }
}
