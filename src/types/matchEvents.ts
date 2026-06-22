import type {
  Skill, SkillType, Evaluation, ServeType, SanctionType,
} from './volleyball';

export type MatchEventType =
  | 'match_started'
  | 'touch'
  | 'point'
  | 'rotation'
  | 'set_ended'
  | 'substitution'
  | 'timeout'
  | 'sanction'
  | 'score_adjustment'
  | 'serving_team_set';

interface BaseEvent {
  id: string;
  timestamp: string;
}

export interface MatchStartedEvent extends BaseEvent {
  type: 'match_started';
  homeLineup: number[];
  awayLineup: number[];
  homeSetterPosition: number;
  awaySetterPosition: number;
  homeBenchedMb: number | null;
  awayBenchedMb: number | null;
  servingTeam: 'home' | 'away';
}

export interface TouchEvent extends BaseEvent {
  type: 'touch';
  team: 'home' | 'away';
  playerNumber: number;
  skill: Skill;
  skillType: SkillType;
  evaluation: Evaluation;
  startZone?: number;
  endZone?: number;
  attackCode?: string;
  landingZone?: number;
  serveType?: ServeType;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  homeSetterPosition: number;
  awaySetterPosition: number;
  homeLineup: number[];
  awayLineup: number[];
  servingTeam: 'home' | 'away';
  homeBenchedMb: number | null;
  awayBenchedMb: number | null;
  rallyId: string;
  phase: 'K1' | 'K2';
  code: string;
}

export interface PointEvent extends BaseEvent {
  type: 'point';
  team: 'home' | 'away';
  homeScoreBefore: number;
  awayScoreBefore: number;
  homeLineupBefore: number[];
  awayLineupBefore: number[];
  homeSetterPositionBefore: number;
  awaySetterPositionBefore: number;
  servingTeamBefore: 'home' | 'away';
  homeBenchedMbBefore: number | null;
  awayBenchedMbBefore: number | null;
}

export interface SetEndedEvent extends BaseEvent {
  type: 'set_ended';
  setNumber: number;
  homeScore: number;
  awayScore: number;
  homeLineupNext: number[];
  awayLineupNext: number[];
  homeBenchedMbNext: number | null;
  awayBenchedMbNext: number | null;
}

export interface SubstitutionEvent extends BaseEvent {
  type: 'substitution';
  team: 'home' | 'away';
  playerOut: number;
  playerIn: number;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  countTowardsLimit: boolean;
}

export interface TimeoutEvent extends BaseEvent {
  type: 'timeout';
  team: 'home' | 'away';
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface SanctionEvent extends BaseEvent {
  type: 'sanction';
  team: 'home' | 'away';
  sanctionType: SanctionType;
  playerNumber: number | null;
  note?: string;
  setNumber: number;
}

export interface ScoreAdjustmentEvent extends BaseEvent {
  type: 'score_adjustment';
  team: 'home' | 'away';
  delta: number;
}

export interface ServingTeamSetEvent extends BaseEvent {
  type: 'serving_team_set';
  team: 'home' | 'away';
}

export type MatchEvent =
  | MatchStartedEvent
  | TouchEvent
  | PointEvent
  | SetEndedEvent
  | SubstitutionEvent
  | TimeoutEvent
  | SanctionEvent
  | ScoreAdjustmentEvent
  | ServingTeamSetEvent;
