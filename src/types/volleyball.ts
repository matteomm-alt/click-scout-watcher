export type PlayerRole = 'S' | 'O' | 'OP' | 'M' | 'L' | 'U'; // Setter, Outside, Opposite, Middle, Libero, Universal

export interface Player {
  id: string;
  number: number;
  lastName: string;
  firstName: string;
  role: PlayerRole;
  isLibero: boolean;
  isCaptain: boolean;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  coach: string;
  assistantCoach: string;
  players: Player[];
  color: string;
}

export interface MatchInfo {
  date: string;
  time: string;
  season: string;
  league: string;
  phase: string;
  venue: string;
  city: string;
  referee1: string;
  referee2: string;
  scorer: string;
  totalSets: number; // 3 or 5
}

export interface Lineup {
  // positions P1-P6, player IDs
  p1: string | null;
  p2: string | null;
  p3: string | null;
  p4: string | null;
  p5: string | null;
  p6: string | null;
  libero1: string | null;
  libero2: string | null;
  setter: string | null; // who is the setter (player ID)
}

export type Skill = 'S' | 'R' | 'A' | 'B' | 'D' | 'E' | 'F'; // Serve, Receive, Attack, Block, Dig, Set, Freeball
export type SkillType = 'H' | 'M' | 'Q' | 'T' | 'N' | 'O' | 'U'; // High, Medium, Quick, Tempo, Nil, Other, Unknown
export type Evaluation = '#' | '+' | '!' | '-' | '/' | '='; // Kill/Perfect, Positive, OK, Negative, Poor, Error

export const SKILL_LABELS: Record<Skill, string> = {
  S: 'Battuta',
  R: 'Ricezione',
  A: 'Attacco',
  B: 'Muro',
  D: 'Difesa',
  E: 'Alzata',
  F: 'Freeball',
};

export const EVALUATION_LABELS: Record<Evaluation, string> = {
  '#': 'Perfetto',
  '+': 'Positivo',
  '!': 'OK',
  '-': 'Negativo',
  '/': 'Scarso',
  '=': 'Errore',
};

export const EVALUATION_COLORS: Record<Evaluation, string> = {
  '#': 'success',
  '+': 'accent',
  '!': 'warning',
  '-': 'primary',
  '/': 'destructive',
  '=': 'destructive',
};

export const ROLE_LABELS: Record<PlayerRole, string> = {
  S: 'Palleggiatore',
  O: 'Schiacciatore',
  OP: 'Opposto',
  M: 'Centrale',
  L: 'Libero',
  U: 'Universale',
};

export interface ScoutAction {
  id: string;
  timestamp: string;
  team: 'home' | 'away';
  playerNumber: number;
  skill: Skill;
  skillType: SkillType;
  evaluation: Evaluation;
  startZone?: number;
  endZone?: number;
  attackCode?: string;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  homeSetterPosition: number;
  awaySetterPosition: number;
  homeLineup: number[]; // 6 player numbers in rotation order
  awayLineup: number[]; // 6 player numbers in rotation order
  code: string; // raw DVW code
}

export interface SetResult {
  homeScore: number;
  awayScore: number;
  duration: number; // minutes
}

export interface MatchState {
  currentSet: number;
  homeScore: number;
  awayScore: number;
  homeSetsWon: number;
  awaySetsWon: number;
  setResults: SetResult[];
  servingTeam: 'home' | 'away';
  homeSetterPosition: number; // 1-6
  awaySetterPosition: number; // 1-6
  homeCurrentLineup: number[]; // 6 player numbers P1-P6
  awayCurrentLineup: number[]; // 6 player numbers P1-P6
  isMatchStarted: boolean;
  isMatchEnded: boolean;
  actions: ScoutAction[];
}

export type AppStep = 'setup' | 'roster' | 'lineup' | 'scout';
