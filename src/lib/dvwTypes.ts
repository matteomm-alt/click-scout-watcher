// ─── DVW Types ───────────────────────────────────────────────────────────────
 
export type DVWSkill = 'S' | 'R' | 'E' | 'A' | 'B' | 'D' | 'F';
export type DVWEvaluation = '#' | '+' | '!' | '-' | '/' | '=';
export type DVWTeam = '*' | 'a';
 
export interface DVWAction {
  team: DVWTeam;
  playerNum: number;
  skill: DVWSkill;
  tipo: string;
  evaluation: DVWEvaluation | '';
  z1: number | null;
  z2: number | null;
  setNum: number | null;
  homeScore: number | null;
  awayScore: number | null;
  lineupHome: number[];
  lineupAway: number[];
}
 
export interface DVWPlayer {
  number: number;
  surname: string;
  name: string;
  fullName: string;
  team: 'home' | 'away';
}
 
export interface DVWSet {
  homeScore: number;
  awayScore: number;
}
 
export interface DVWRawData {
  match: { date?: string; league?: string; duration?: string };
  teams: { home: { name: string } | null; away: { name: string } | null };
  players: { home: DVWPlayer[]; away: DVWPlayer[] };
  sets: DVWSet[];
  actions: DVWAction[];
}
 
export interface SkillStats {
  tot: number;
  pos: number;
  neg: number;
  perf: number;
  err: number;
  byTipo: Record<string, { tot: number; pos: number; perf: number; err: number; neg: number }>;
  byZone: Record<number, { tot: number; pos: number; perf: number; err: number; neg: number }>;
  bySet: Record<number, { tot: number; pos: number; perf: number; err: number; neg: number }>;
  raw: { ev: string; tipo: string; z1: number | null; z2: number | null; set: number | null }[];
}
 
export interface RotStats {
  tot: number;
  pos: number;
  perf: number;
  err: number;
  neg: number;
  bySkill: Record<string, { tot: number; pos: number; perf: number; err: number; neg: number }>;
}
 
export interface SystemStat {
  att: number;
  pts: number;
  pct: number;
}
 
export interface SystemStats {
  fbso: SystemStat;
  so: SystemStat;
  ps: SystemStat;
  fbps: SystemStat;
  rallies: number;
}
 
export interface HitEff {
  eff: number;
  kills: number;
  errors: number;
  att: number;
  byPlayer: Record<string, { kills: number; errors: number; att: number; eff: number }>;
}
 
export interface DirectionalAction {
  z1: number;
  z2: number;
  ev: string;
  num: number;
}
 
export interface DVWStats {
  homeTeam: string;
  awayTeam: string;
  result: string;
  setScores: string[];
  won: boolean;
  playerStats: Record<string, Record<DVWSkill, SkillStats>>;
  teamStats: Record<DVWSkill, {
    tot: number; perf: number; pos: number; err: number; neg: number;
    percPos: number; percPerf: number; percErr: number;
    byTipo: Record<string, { tot: number; pos: number; perf: number; err: number; neg: number }>;
    byZone: Record<number, { tot: number; pos: number; perf: number; err: number; neg: number }>;
    bySet: Record<number, { tot: number; pos: number; perf: number; err: number; neg: number }>;
  }>;
  setterName: string | null;
  rotStats: Record<number, RotStats>;
  systemStats: SystemStats;
  hitEff: HitEff;
  directional: Record<string, DirectionalAction[]>;
  skillNames: Record<string, string>;
}
 
export interface DVWMatch {
  id: string;
  fileName: string;
  data: string;
  avversario: string;
  squadraCasa: string;
  risultato: string;
  setScores: string[];
  vinta: boolean;
  teamStats: DVWStats['teamStats'];
  playerStats: DVWStats['playerStats'];
  setterName: string | null;
  rotStats: Record<number, RotStats>;
  systemStats: SystemStats;
  hitEff: HitEff;
  directional: Record<string, DirectionalAction[]>;
  importedAt: string;
}
