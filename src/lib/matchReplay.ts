import type { MatchState, Team, Lineup, SetResult, TimeoutRecord, Sanction, ScoutAction, Evaluation } from '@/types/volleyball';
import type { MatchEvent } from '@/types/matchEvents';
import {
  getInitialPhases,
  getNextPhases,
  resetPhasesAfterPoint,
} from '@/lib/tacticalPhases';

// ── Copia identica da matchStore — NON modificare ──────────────────
export function applyLiberoAutoSwap(
  lineup: number[],
  team: Team,
  liberoNum: number | null | undefined,
  benchedMb: number | null | undefined,
): { lineup: number[]; benchedMb: number | null } {
  if (!liberoNum) return { lineup: [...lineup], benchedMb: benchedMb ?? null };
  const roleOf = (n: number) => team.players.find((p) => p.number === n)?.role;
  const out = [...lineup];
  let benched: number | null = benchedMb ?? null;
  const liberoIdx = out.indexOf(liberoNum);
  if (benched != null && liberoIdx >= 0 && [1, 2, 3].includes(liberoIdx)) {
    out[liberoIdx] = benched;
    benched = null;
  }
  if (benched == null) {
    for (const idx of [0, 4, 5]) {
      const num = out[idx];
      if (num && num !== liberoNum && roleOf(num) === 'M') {
        benched = num;
        out[idx] = liberoNum;
        break;
      }
    }
  }
  return { lineup: out, benchedMb: benched };
}

export interface ReplayContext {
  homeTeam: Team;
  awayTeam: Team;
  homeLineup: Lineup;
  awayLineup: Lineup;
  totalSets: number;
}

function emptyState(): MatchState {
  return {
    currentSet: 1,
    homeScore: 0,
    awayScore: 0,
    homeSetsWon: 0,
    awaySetsWon: 0,
    setResults: [],
    servingTeam: 'home',
    homeSetterPosition: 1,
    awaySetterPosition: 1,
    homeCurrentLineup: [],
    awayCurrentLineup: [],
    isMatchStarted: false,
    isMatchEnded: false,
    singleTeamMode: false,
    actions: [],
    homeTimeoutsUsed: 0,
    awayTimeoutsUsed: 0,
    homeSubstitutionsUsed: 0,
    awaySubstitutionsUsed: 0,
    timeouts: [],
    sanctions: [],
    setOverPending: false,
    homeBenchedMb: null,
    awayBenchedMb: null,
    teamTacticalPhases: getInitialPhases('home'),
  };
}

export function applyEvent(
  state: MatchState,
  event: MatchEvent,
  ctx: ReplayContext,
): MatchState {
  switch (event.type) {
    case 'match_started':
      return {
        ...state,
        isMatchStarted: true,
        homeCurrentLineup: event.homeLineup,
        awayCurrentLineup: event.awayLineup,
        homeSetterPosition: event.homeSetterPosition,
        awaySetterPosition: event.awaySetterPosition,
        homeBenchedMb: event.homeBenchedMb,
        awayBenchedMb: event.awayBenchedMb,
        servingTeam: event.servingTeam,
        teamTacticalPhases: getInitialPhases(event.servingTeam),
      };

    case 'touch': {
      const action: ScoutAction = {
        id: event.id,
        timestamp: event.timestamp,
        team: event.team,
        playerNumber: event.playerNumber,
        skill: event.skill,
        skillType: event.skillType,
        evaluation: event.evaluation,
        startZone: event.startZone,
        endZone: event.endZone,
        attackCode: event.attackCode,
        serveType: event.serveType,
        setNumber: event.setNumber,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        homeSetterPosition: event.homeSetterPosition,
        awaySetterPosition: event.awaySetterPosition,
        homeLineup: event.homeLineup,
        awayLineup: event.awayLineup,
        code: event.code,
        servingTeam: event.servingTeam,
        homeBenchedMb: event.homeBenchedMb,
        awayBenchedMb: event.awayBenchedMb,
        rallyId: event.rallyId,
        phase: event.phase,
      };
      const actions = [...state.actions, action];
      try {
        const settingsRaw = typeof window !== 'undefined'
          ? window.localStorage.getItem('scout_settings') : null;
        const autoCorrelation = settingsRaw
          ? JSON.parse(settingsRaw).autoCorrelation !== false : true;
        if (autoCorrelation) {
          if (action.skill === 'R') {
            const map: Partial<Record<Evaluation, Evaluation>> = {
              '#': '-', '+': '-', '-': '+', '/': '/', '=': '#',
            };
            const nextEval = map[action.evaluation];
            const idx = [...actions].reverse()
              .findIndex(a => a.skill === 'S' && a.setNumber === action.setNumber);
            if (nextEval && idx >= 0) {
              const realIdx = actions.length - 1 - idx;
              actions[realIdx] = { ...actions[realIdx], evaluation: nextEval };
            }
          }
          if (action.skill === 'B') {
            const map: Partial<Record<Evaluation, Evaluation>> = {
              '#': '/', '+': '-', '=': '#', '!': '!', '/': '#',
            };
            const nextEval = map[action.evaluation];
            const idx = [...actions].reverse()
              .findIndex(a => a.skill === 'A' && a.setNumber === action.setNumber);
            if (nextEval && idx >= 0) {
              const realIdx = actions.length - 1 - idx;
              actions[realIdx] = { ...actions[realIdx], evaluation: nextEval };
            }
          }
          // L'Alzata non ha una zona propria nel flusso semplificato: eredita la
          // zona di partenza dell'Attacco che la segue.
          if (action.skill === 'A' && action.endZone != null) {
            const idx = [...actions].reverse()
              .findIndex(a => a.skill === 'E' && a.setNumber === action.setNumber);
            if (idx >= 0) {
              const realIdx = actions.length - 1 - idx;
              actions[realIdx] = { ...actions[realIdx], endZone: action.endZone };
            }
          }
        }
      } catch {}
      const prevAction = state.actions[state.actions.length - 1];
      const currentPhases = state.teamTacticalPhases ?? getInitialPhases(state.servingTeam);
      const newPhases = getNextPhases(
        currentPhases,
        action.skill,
        action.team,
        action.evaluation,
        prevAction?.skill,
        prevAction?.team,
      );
      return { ...state, actions, teamTacticalPhases: newPhases };
    }

    case 'point': {
      const newHomeScore = event.team === 'home'
        ? event.homeScoreBefore + 1 : event.homeScoreBefore;
      const newAwayScore = event.team === 'away'
        ? event.awayScoreBefore + 1 : event.awayScoreBefore;
      const maxScore = state.currentSet === ctx.totalSets ? 15 : 25;
      const isSetOver = (newHomeScore >= maxScore || newAwayScore >= maxScore)
        && Math.abs(newHomeScore - newAwayScore) >= 2;
      if (isSetOver) {
        return {
          ...state,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          setOverPending: true,
        };
      }
      const needsRotation = event.servingTeamBefore !== event.team;
      let newHomeLineup = [...event.homeLineupBefore];
      let newAwayLineup = [...event.awayLineupBefore];
      let newHomeSetterPos = event.homeSetterPositionBefore;
      let newAwaySetterPos = event.awaySetterPositionBefore;
      let newHomeBenchedMb = event.homeBenchedMbBefore;
      let newAwayBenchedMb = event.awayBenchedMbBefore;
      if (needsRotation) {
        const teamData = event.team === 'home' ? ctx.homeTeam : ctx.awayTeam;
        const teamLineup = event.team === 'home' ? ctx.homeLineup : ctx.awayLineup;
        const lineup = event.team === 'home'
          ? [...newHomeLineup] : [...newAwayLineup];
        const setterPos = event.team === 'home'
          ? newHomeSetterPos : newAwaySetterPos;
        const benchedMb = event.team === 'home'
          ? newHomeBenchedMb : newAwayBenchedMb;
        const first = lineup[0];
        for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
        lineup[5] = first;
        const newSetterPos = setterPos === 1 ? 6 : setterPos - 1;
        const liberoNum = teamData.players
          .find(p => p.id === teamLineup.libero1)?.number ?? null;
        const swapped = applyLiberoAutoSwap(lineup, teamData, liberoNum, benchedMb);
        if (event.team === 'home') {
          newHomeLineup = swapped.lineup;
          newHomeSetterPos = newSetterPos;
          newHomeBenchedMb = swapped.benchedMb;
        } else {
          newAwayLineup = swapped.lineup;
          newAwaySetterPos = newSetterPos;
          newAwayBenchedMb = swapped.benchedMb;
        }
      }
      return {
        ...state,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        servingTeam: event.team,
        homeCurrentLineup: newHomeLineup,
        awayCurrentLineup: newAwayLineup,
        homeSetterPosition: newHomeSetterPos,
        awaySetterPosition: newAwaySetterPos,
        homeBenchedMb: newHomeBenchedMb,
        awayBenchedMb: newAwayBenchedMb,
        teamTacticalPhases: resetPhasesAfterPoint(event.team),
      };
    }

    case 'set_ended': {
      const homeWon = event.homeScore > event.awayScore;
      const newHomeSetsWon = state.homeSetsWon + (homeWon ? 1 : 0);
      const newAwaySetsWon = state.awaySetsWon + (homeWon ? 0 : 1);
      const maxSets = Math.ceil(ctx.totalSets / 2);
      const isMatchOver = newHomeSetsWon >= maxSets || newAwaySetsWon >= maxSets;
      const setResult: SetResult = {
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        duration: 0,
      };
      return {
        ...state,
        setResults: [...state.setResults, setResult],
        homeSetsWon: newHomeSetsWon,
        awaySetsWon: newAwaySetsWon,
        currentSet: isMatchOver ? state.currentSet : state.currentSet + 1,
        homeScore: isMatchOver ? state.homeScore : 0,
        awayScore: isMatchOver ? state.awayScore : 0,
        isMatchEnded: isMatchOver,
        homeTimeoutsUsed: isMatchOver ? state.homeTimeoutsUsed : 0,
        awayTimeoutsUsed: isMatchOver ? state.awayTimeoutsUsed : 0,
        homeSubstitutionsUsed: 0,
        awaySubstitutionsUsed: 0,
        homeSetterPosition: 1,
        awaySetterPosition: 1,
        homeCurrentLineup: event.homeLineupNext,
        awayCurrentLineup: event.awayLineupNext,
        homeBenchedMb: event.homeBenchedMbNext,
        awayBenchedMb: event.awayBenchedMbNext,
        setOverPending: false,
      };
    }

    case 'substitution': {
      const lineupKey = event.team === 'home'
        ? 'homeCurrentLineup' : 'awayCurrentLineup';
      const usedKey = event.team === 'home'
        ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
      const lineup = [...state[lineupKey]];
      const idx = lineup.indexOf(event.playerOut);
      if (idx >= 0) lineup[idx] = event.playerIn;
      return {
        ...state,
        [lineupKey]: lineup,
        [usedKey]: state[usedKey] + (event.countTowardsLimit ? 1 : 0),
      };
    }

    case 'timeout': {
      const usedKey = event.team === 'home'
        ? 'homeTimeoutsUsed' : 'awayTimeoutsUsed';
      const record: TimeoutRecord = {
        id: event.id,
        team: event.team,
        setNumber: event.setNumber,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        timestamp: event.timestamp,
      };
      return {
        ...state,
        [usedKey]: state[usedKey] + 1,
        timeouts: [...state.timeouts, record],
      };
    }

    case 'sanction': {
      const sanction: Sanction = {
        id: event.id,
        team: event.team,
        type: event.sanctionType,
        playerNumber: event.playerNumber,
        setNumber: event.setNumber,
        timestamp: event.timestamp,
        note: event.note,
      };
      return {
        ...state,
        sanctions: [...state.sanctions, sanction],
      };
    }

    case 'score_adjustment': {
      const key = event.team === 'home' ? 'homeScore' : 'awayScore';
      return { ...state, [key]: Math.max(0, state[key] + event.delta) };
    }

    case 'serving_team_set':
      return {
        ...state,
        servingTeam: event.team,
        teamTacticalPhases: getInitialPhases(event.team),
      };

    default:
      return state;
  }
}

export function replayMatch(
  events: MatchEvent[],
  ctx: ReplayContext,
): MatchState {
  return events.reduce(
    (state, event) => applyEvent(state, event, ctx),
    emptyState(),
  );
}
