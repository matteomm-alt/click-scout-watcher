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

// Serve types (DVW convention: skill type letter)
export type ServeType = 'M' | 'Q' | 'H' | 'T' | 'N';
export const SERVE_TYPES: { key: ServeType; label: string; description: string }[] = [
  { key: 'M', label: 'Jump Float', description: 'Salto float' },
  { key: 'Q', label: 'Jump Spin', description: 'Salto spin' },
  { key: 'H', label: 'Float', description: 'Float da fermo' },
  { key: 'T', label: 'Spin', description: 'Spin da fermo' },
  { key: 'N', label: 'Sky Ball', description: 'Sky ball' },
];

// Attack combinations (standard DVW codes)
export interface AttackCombo {
  code: string;
  label: string;
  description: string;
  tempo: 'Q' | 'M' | 'T' | 'H' | 'O' | 'N' | 'U'; // Quick, Medium, Tempo(3rd), High, Other, Nil, Unknown
  position: 'F' | 'C' | 'B' | 'P' | 'S' | '-'; // Front, Center, Back, Pipe, Setter, Other
}

export const ATTACK_COMBOS: AttackCombo[] = [
  // Quick tempo (1° tempo)
  { code: 'X1', label: 'X1', description: 'Veloce avanti', tempo: 'Q', position: 'C' },
  { code: 'XM', label: 'XM', description: 'Veloce in 3', tempo: 'Q', position: 'C' },
  { code: 'XF', label: 'XF', description: 'Veloce dietro', tempo: 'Q', position: 'C' },
  { code: 'X2', label: 'X2', description: 'Veloce dietro bassa', tempo: 'Q', position: 'C' },
  { code: 'XC', label: 'XC', description: 'Veloce lontana da palleggiatore', tempo: 'Q', position: 'C' },
  { code: 'X7', label: 'X7', description: 'Veloce bassa avanti', tempo: 'Q', position: 'C' },
  // Medium tempo (2° tempo)
  { code: 'X5', label: 'X5', description: 'Mezza in 4', tempo: 'T', position: 'F' },
  { code: 'X6', label: 'X6', description: 'Mezza in 2', tempo: 'T', position: 'B' },
  { code: 'X3', label: 'X3', description: 'Mezza da posto 2', tempo: 'M', position: 'B' },
  { code: 'XT', label: 'XT', description: 'Mezza da posto 4', tempo: 'M', position: 'F' },
  // Pipe
  { code: 'XP', label: 'XP', description: 'Pipe', tempo: 'M', position: 'P' },
  { code: 'XB', label: 'XB', description: 'Pipe 6-1', tempo: 'M', position: 'P' },
  { code: 'XR', label: 'XR', description: 'Pipe 6-5', tempo: 'M', position: 'P' },
  // High ball (palla alta)
  { code: 'V5', label: 'V5', description: 'Palla alta in 4', tempo: 'H', position: 'F' },
  { code: 'V6', label: 'V6', description: 'Palla alta in 2', tempo: 'H', position: 'B' },
  { code: 'V0', label: 'V0', description: 'Palla alta in 5', tempo: 'H', position: 'F' },
  { code: 'V8', label: 'V8', description: 'Palla alta in 1', tempo: 'H', position: 'B' },
  { code: 'VP', label: 'VP', description: 'Pipe alta', tempo: 'H', position: 'P' },
  { code: 'V3', label: 'V3', description: 'Palla alta in 3', tempo: 'H', position: '-' },
  // Slide
  { code: 'CB', label: 'CB', description: 'Slide vicino palleggiatore', tempo: 'Q', position: 'C' },
  { code: 'CF', label: 'CF', description: 'Slide corto', tempo: 'Q', position: 'C' },
  { code: 'CD', label: 'CD', description: 'Slide lontano', tempo: 'Q', position: 'C' },
  // Other
  { code: 'PP', label: 'PP', description: 'Palleggiatore 2° tocco', tempo: 'O', position: 'S' },
  { code: 'PR', label: 'PR', description: 'Attacco su freeball', tempo: 'O', position: '-' },
];

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
  serveType?: ServeType;
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

export type SanctionType = 'yellow' | 'red' | 'expulsion' | 'disqualification';

export interface Sanction {
  id: string;
  team: 'home' | 'away';
  type: SanctionType;
  // Player number; null for team/staff sanction
  playerNumber: number | null;
  setNumber: number;
  timestamp: string;
  note?: string;
}

export interface TimeoutRecord {
  id: string;
  team: 'home' | 'away';
  setNumber: number;
  homeScore: number;
  awayScore: number;
  timestamp: string;
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
  singleTeamMode?: boolean;
  actions: ScoutAction[];
  // Time-outs used in the CURRENT set per team (max 2)
  homeTimeoutsUsed: number;
  awayTimeoutsUsed: number;
  homeSubstitutionsUsed: number;
  awaySubstitutionsUsed: number;
  timeouts: TimeoutRecord[];
  sanctions: Sanction[];
}

export type AppStep = 'setup' | 'roster' | 'lineup' | 'scout';
