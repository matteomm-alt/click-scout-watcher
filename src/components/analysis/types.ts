export interface MatchRow {
  id: string;
  match_date: string | null;
  league: string | null;
  venue: string | null;
  home_sets_won: number;
  away_sets_won: number;
  set_results: unknown;
  source_filename: string | null;
  share_token?: string | null;
  home_team: { id: string; name: string };
  away_team: { id: string; name: string };
}

export interface PlayerRow {
  scout_team_id: string;
  number: number;
  last_name: string;
  first_name: string | null;
  role: string | null;
}
