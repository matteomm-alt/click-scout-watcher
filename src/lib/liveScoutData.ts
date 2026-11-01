import type { MatchInfo, MatchState, ScoutAction, Skill, Team } from '@/types/volleyball';
import type { DbAction } from '@/lib/scoutAnalysis';

export interface LiveHeatmapFilters {
  skill: Skill | string;
  team: 'all' | 'home' | 'away';
  evaluation: string;
  player: number | null;
}

/** Conteggio per zona delle azioni filtrate (heatmap live dello scout). */
export function computeLiveHeatmap(actions: ScoutAction[], f: LiveHeatmapFilters) {
  const home: Record<number, number> = {};
  const away: Record<number, number> = {};
  actions
    .filter((a) => {
      if (a.skill !== f.skill) return false;
      if (f.team !== 'all' && a.team !== f.team) return false;
      if (f.evaluation !== 'all' && a.evaluation !== f.evaluation) return false;
      if (f.player !== null && a.playerNumber !== f.player) return false;
      return true;
    })
    .forEach((a) => {
      const zone = f.skill === 'A' ? a.endZone : a.startZone;
      if (!zone) return;
      const target = a.team === 'home' ? home : away;
      target[zone] = (target[zone] || 0) + 1;
    });
  return (Object.keys(home).length > 0 || Object.keys(away).length > 0) ? { home, away } : undefined;
}

/** Colore della heatmap in base al fondamentale selezionato. */
export function liveHeatmapColor(skill: Skill | string): string {
  return skill === 'A'
    ? 'hsl(0 84% 55%)'      // rosso = attacco
    : skill === 'S'
      ? 'hsl(142 71% 45%)'  // verde = battuta
      : 'hsl(217 91% 60%)'; // blu = ricezione
}

/** Ultimi 5 attacchi con zone di partenza e arrivo, per le frecce sul campo. */
export function lastAttackArrows(actions: ScoutAction[]) {
  return actions
    .filter((a) => a.skill === 'A' && a.startZone != null && a.endZone != null)
    .slice(-5)
    .map((a) => ({ startZone: a.startZone!, endZone: a.endZone!, evaluation: a.evaluation, team: a.team }));
}

/** Dati per il report PDF immediato dallo scout live. */
export function buildLiveReportInput(
  matchInfo: MatchInfo, homeTeam: Team, awayTeam: Team, matchState: MatchState, sessionId: string,
) {
  const homeTeamId = homeTeam.id || 'home';
  const awayTeamId = awayTeam.id || 'away';
  const actions: DbAction[] = matchState.actions.map((a, i) => ({
    id: a.id,
    scout_match_id: sessionId,
    scout_team_id: a.team === 'home' ? homeTeamId : awayTeamId,
    side: a.team,
    set_number: a.setNumber,
    rally_index: 0,
    action_index: i,
    player_number: a.playerNumber,
    skill: a.skill,
    skill_type: a.skillType ?? null,
    evaluation: a.evaluation,
    start_zone: a.startZone ?? null,
    end_zone: a.endZone ?? null,
    end_subzone: null,
    attack_combo: a.attackCode ?? null,
    home_score: a.homeScore,
    away_score: a.awayScore,
    home_rotation: a.homeLineup ?? null,
    away_rotation: a.awayLineup ?? null,
    home_setter_pos: a.homeSetterPosition ?? null,
    away_setter_pos: a.awaySetterPosition ?? null,
    serving_side: a.servingTeam ?? null,
    landing_zone: a.landingZone ?? null,
    start_x: a.startX ?? null, start_y: a.startY ?? null,
    end_x: a.endX ?? null, end_y: a.endY ?? null,
    landing_x: a.landingX ?? null, landing_y: a.landingY ?? null,
    timestamp_clock: a.timestamp ?? null,
  }));
  const mapPlayers = (team: typeof homeTeam, teamId: string) =>
    (team.players ?? []).map(p => ({
      scout_team_id: teamId,
      number: p.number,
      last_name: p.lastName || String(p.number),
      first_name: p.firstName || null,
      role: p.role ?? null,
    }));
  const players = [
    ...mapPlayers(homeTeam, homeTeamId),
    ...mapPlayers(awayTeam, awayTeamId),
  ];
  const meta = {
    homeName: homeTeam.name || 'Casa',
    awayName: awayTeam.name || 'Ospite',
    homeTeamId,
    awayTeamId,
    date: matchInfo.date,
    venue: matchInfo.venue || '',
    league: matchInfo.league || '',
    setResults: matchState.setResults.map(r => ({
      intermediates: [`${r.homeScore}-${r.awayScore}`],
      duration: r.duration,
    })),
    homeSetsWon: matchState.homeSetsWon,
    awaySetsWon: matchState.awaySetsWon,
  };
  return { homeTeamId, awayTeamId, actions, players, meta };
}
