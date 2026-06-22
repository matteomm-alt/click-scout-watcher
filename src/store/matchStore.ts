import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Team, Player, MatchInfo, Lineup, MatchState, ScoutAction,
  AppStep, SanctionType, Evaluation,
} from '@/types/volleyball';
import type { MatchEvent, TouchEvent } from '@/types/matchEvents';
import {
  cloneDefaultFormations,
  cloneDefaultAttackFormations,
  cloneDefaultDefenseFormations,
  type ReceptionFormations,
  type Coord,
} from '@/lib/receptionFormations';
import { getInitialPhases } from '@/lib/tacticalPhases';
import {
  applyLiberoAutoSwap,
  applyEvent,
  replayMatch,
  type ReplayContext,
} from '@/lib/matchReplay';
import { toast } from 'sonner';

interface MatchStore {
  step: AppStep;
  setStep: (step: AppStep) => void;

  matchInfo: MatchInfo;
  setMatchInfo: (info: Partial<MatchInfo>) => void;

  homeTeam: Team;
  awayTeam: Team;
  setHomeTeam: (team: Partial<Team>) => void;
  setAwayTeam: (team: Partial<Team>) => void;
  addPlayer: (teamSide: 'home' | 'away', player: Player) => void;
  removePlayer: (teamSide: 'home' | 'away', playerId: string) => void;
  updatePlayer: (teamSide: 'home' | 'away', playerId: string, updates: Partial<Player>) => void;

  homeLineup: Lineup;
  awayLineup: Lineup;
  setHomeLineup: (lineup: Partial<Lineup>) => void;
  setAwayLineup: (lineup: Partial<Lineup>) => void;

  events: MatchEvent[];
  lastRetroCorrectedId: string | null;
  matchState: MatchState;

  startMatch: () => void;
  addAction: (action: Omit<ScoutAction,
    'id' | 'setNumber' | 'homeScore' | 'awayScore' |
    'homeSetterPosition' | 'awaySetterPosition' |
    'homeLineup' | 'awayLineup'>) => string;
  updateAction: (id: string, updates: {
    playerNumber?: number;
    evaluation?: Evaluation;
    startZone?: number | null;
    endZone?: number | null;
    attackCode?: string | null;
  }) => void;
  deleteAction: (id: string) => void;
  setSingleTeamMode: (v: boolean) => void;
  adjustScore: (team: 'home' | 'away', delta: number) => void;
  setServingTeam: (team: 'home' | 'away') => void;
  addPoint: (team: 'home' | 'away') => void;
  rotateTeam: (team: 'home' | 'away') => void;
  endSet: () => void;
  undoLastAction: () => void;
  undoRally: () => number;
  substitutePlayer: (team: 'home' | 'away', outNumber: number, inNumber: number) => void;
  doubleSwitch51: (team: 'home' | 'away') => void;
  validateLineup: (team: 'home' | 'away') => string[];
  callTimeout: (team: 'home' | 'away') => boolean;
  addSanction: (team: 'home' | 'away', type: SanctionType,
    playerNumber: number | null, note?: string) => void;
  removeSanction: (id: string) => void;
  resetMatch: () => void;
  loadDemoMatch: () => void;

  homeReceptionFormations: ReceptionFormations;
  awayReceptionFormations: ReceptionFormations;
  setReceptionPosition: (team: 'home' | 'away', setterPosition: number,
    slot: number, coord: Coord) => void;
  resetReceptionFormations: (team: 'home' | 'away') => void;
  homeAttackFormations: ReceptionFormations;
  awayAttackFormations: ReceptionFormations;
  setAttackPosition: (team: 'home' | 'away', setterPosition: number,
    slot: number, coord: Coord) => void;
  resetAttackFormations: (team: 'home' | 'away') => void;
  loadReceptionFormations: (team: 'home' | 'away', formations: ReceptionFormations) => void;
  loadAttackFormations: (team: 'home' | 'away', formations: ReceptionFormations) => void;
  homeDefenseFormations: ReceptionFormations;
  awayDefenseFormations: ReceptionFormations;
  setDefensePosition: (team: 'home'|'away', setterPosition: 1|2|3|4|5|6, slot: 1|2|3|4|5|6, coord: Coord) => void;
  resetDefenseFormations: (team: 'home'|'away') => void;
  loadDefenseFormations: (team: 'home'|'away', formations: ReceptionFormations) => void;
  removeLastTouchFromCurrentRally: () => boolean;
}

const defaultMatchInfo: MatchInfo = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  season: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
  league: '', phase: '', venue: '', city: '',
  referee1: '', referee2: '', scorer: '', totalSets: 5,
};
const defaultTeam: Team = {
  id: '', code: '', name: '', coach: '', assistantCoach: '',
  players: [], color: '#ffffff',
};
const defaultLineup: Lineup = {
  p1: null, p2: null, p3: null, p4: null, p5: null, p6: null,
  libero1: null, libero2: null, setter: null,
};
const emptyMatchState: MatchState = {
  currentSet: 1, homeScore: 0, awayScore: 0,
  homeSetsWon: 0, awaySetsWon: 0, setResults: [],
  servingTeam: 'home', homeSetterPosition: 1, awaySetterPosition: 1,
  homeCurrentLineup: [], awayCurrentLineup: [],
  isMatchStarted: false, isMatchEnded: false, singleTeamMode: false,
  actions: [], homeTimeoutsUsed: 0, awayTimeoutsUsed: 0,
  homeSubstitutionsUsed: 0, awaySubstitutionsUsed: 0,
  timeouts: [], sanctions: [], setOverPending: false,
  homeBenchedMb: null, awayBenchedMb: null,
  teamTacticalPhases: getInitialPhases('home'),
};

const nowTime = () => new Date().toTimeString().slice(0, 8);

const getLineupNumbers = (lineup: Lineup, team: Team): number[] =>
  [lineup.p1, lineup.p2, lineup.p3, lineup.p4, lineup.p5, lineup.p6]
    .map(pid => team.players.find(p => p.id === pid)?.number ?? 0);

function getCtx(s: MatchStore): ReplayContext {
  return {
    homeTeam: s.homeTeam,
    awayTeam: s.awayTeam,
    homeLineup: s.homeLineup,
    awayLineup: s.awayLineup,
    totalSets: s.matchInfo.totalSets,
  };
}

function addEventAndApply(
  s: MatchStore,
  event: MatchEvent,
): Partial<MatchStore> {
  const events = [...s.events, event];
  const matchState = applyEvent(s.matchState, event, getCtx(s));
  return { events, matchState };
}

function replaceEventsAndReplay(
  s: MatchStore,
  events: MatchEvent[],
): Partial<MatchStore> {
  const matchState = replayMatch(events, getCtx(s));
  return { events, matchState };
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      step: 'setup',
      setStep: (step) => set({ step }),

      matchInfo: { ...defaultMatchInfo },
      setMatchInfo: (info) => set((s) => ({
        matchInfo: { ...s.matchInfo, ...info },
      })),

      homeTeam: { ...defaultTeam, id: 'home', code: 'HOM' },
      awayTeam: { ...defaultTeam, id: 'away', code: 'AWY' },
      setHomeTeam: (team) => set((s) => ({
        homeTeam: { ...s.homeTeam, ...team },
      })),
      setAwayTeam: (team) => set((s) => ({
        awayTeam: { ...s.awayTeam, ...team },
      })),
      addPlayer: (side, player) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return { [key]: { ...s[key], players: [...s[key].players, player] } } as Partial<MatchStore>;
      }),
      removePlayer: (side, playerId) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          [key]: {
            ...s[key],
            players: s[key].players.filter(p => p.id !== playerId),
          },
        } as Partial<MatchStore>;
      }),
      updatePlayer: (side, playerId, updates) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          [key]: {
            ...s[key],
            players: s[key].players.map(p =>
              p.id === playerId ? { ...p, ...updates } : p),
          },
        } as Partial<MatchStore>;
      }),

      homeLineup: { ...defaultLineup },
      awayLineup: { ...defaultLineup },
      setHomeLineup: (lineup) => set((s) => ({
        homeLineup: { ...s.homeLineup, ...lineup },
      })),
      setAwayLineup: (lineup) => set((s) => ({
        awayLineup: { ...s.awayLineup, ...lineup },
      })),

      events: [],
      lastRetroCorrectedId: null,
      matchState: { ...emptyMatchState },

      startMatch: () => {
        const { homeLineup, awayLineup, homeTeam, awayTeam, matchState } = get();
        const findSetterPos = (lineup: Lineup): number => {
          const positions = [
            lineup.p1, lineup.p2, lineup.p3,
            lineup.p4, lineup.p5, lineup.p6,
          ];
          const idx = positions.findIndex(pid => pid === lineup.setter);
          return idx >= 0 ? idx + 1 : 1;
        };
        const homeBase = getLineupNumbers(homeLineup, homeTeam);
        const awayBase = getLineupNumbers(awayLineup, awayTeam);
        const homeLib = homeTeam.players
          .find(p => p.id === homeLineup.libero1)?.number ?? null;
        const awayLib = awayTeam.players
          .find(p => p.id === awayLineup.libero1)?.number ?? null;
        const home = applyLiberoAutoSwap(homeBase, homeTeam, homeLib, null);
        const away = applyLiberoAutoSwap(awayBase, awayTeam, awayLib, null);
        const event: MatchEvent = {
          type: 'match_started',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          homeLineup: home.lineup,
          awayLineup: away.lineup,
          homeSetterPosition: findSetterPos(homeLineup),
          awaySetterPosition: findSetterPos(awayLineup),
          homeBenchedMb: home.benchedMb,
          awayBenchedMb: away.benchedMb,
          servingTeam: matchState.servingTeam,
        };
        set((s) => addEventAndApply(s, event));
        try {
          const errs = [
            ...get().validateLineup('home').map(e => `Casa: ${e}`),
            ...get().validateLineup('away').map(e => `Ospite: ${e}`),
          ];
          errs.forEach(e => toast.warning(e, { duration: 4000 }));
        } catch {}
      },

      addAction: (actionData) => {
        const { matchState } = get();
        const id = crypto.randomUUID();
        const rallyId = `${matchState.currentSet}-${matchState.homeScore}-${matchState.awayScore}`;
        const phase: 'K1' | 'K2' = matchState.servingTeam === actionData.team
          ? 'K2' : 'K1';
        const teamPrefix = actionData.team === 'home' ? '*' : 'a';
        const playerStr = String(actionData.playerNumber).padStart(2, '0');
        const startZ = actionData.startZone ?? '~';
        const endZ = actionData.endZone ?? '~';
        const atkCode = actionData.attackCode ?? '~~';
        const code = `${teamPrefix}${playerStr}${actionData.skill}${actionData.skillType ?? 'H'}${actionData.evaluation}${atkCode}~${startZ}${endZ}`;
        const event: MatchEvent = {
          type: 'touch',
          id,
          timestamp: nowTime(),
          team: actionData.team,
          playerNumber: actionData.playerNumber,
          skill: actionData.skill,
          skillType: actionData.skillType ?? 'H',
          evaluation: actionData.evaluation,
          startZone: actionData.startZone,
          endZone: actionData.endZone,
          attackCode: actionData.attackCode,
          serveType: actionData.serveType,
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          homeSetterPosition: matchState.homeSetterPosition,
          awaySetterPosition: matchState.awaySetterPosition,
          homeLineup: [...matchState.homeCurrentLineup],
          awayLineup: [...matchState.awayCurrentLineup],
          servingTeam: matchState.servingTeam,
          homeBenchedMb: matchState.homeBenchedMb ?? null,
          awayBenchedMb: matchState.awayBenchedMb ?? null,
          rallyId,
          phase,
          code,
        };
        set((s) => {
          const next = addEventAndApply(s, event);
          const prevLen = s.matchState.actions.length;
          const nextLen = (next.matchState?.actions.length ?? 0);
          let correctedId: string | null = null;
          if (nextLen > prevLen) {
            const prevAction = s.matchState.actions[prevLen - 1];
            const newAction = next.matchState!.actions[prevLen - 1];
            if (prevAction && newAction && prevAction.evaluation !== newAction.evaluation) {
              correctedId = newAction.id;
              setTimeout(() => toast.info('Valutazione aggiornata', { duration: 1500 }), 0);
            }
          }
          return { ...next, lastRetroCorrectedId: correctedId };
        });
        return id;
      },

      updateAction: (id, updates) => {
        const { events } = get();
        const newEvents = events.map(e => {
          if (e.id !== id || e.type !== 'touch') return e;
          const t = e as TouchEvent;
          return {
            ...t,
            ...(updates.playerNumber !== undefined
              ? { playerNumber: updates.playerNumber } : {}),
            ...(updates.evaluation !== undefined
              ? { evaluation: updates.evaluation } : {}),
            ...(updates.startZone !== undefined
              ? { startZone: updates.startZone ?? undefined } : {}),
            ...(updates.endZone !== undefined
              ? { endZone: updates.endZone ?? undefined } : {}),
          } as TouchEvent;
        });
        set((s) => replaceEventsAndReplay(s, newEvents));
      },

      deleteAction: (id) => {
        const newEvents = get().events.filter(e => e.id !== id);
        set((s) => replaceEventsAndReplay(s, newEvents));
      },

      setSingleTeamMode: (v) => set((s) => ({
        matchState: { ...s.matchState, singleTeamMode: v },
      })),

      adjustScore: (team, delta) => {
        const event: MatchEvent = {
          type: 'score_adjustment',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
          delta,
        };
        set((s) => addEventAndApply(s, event));
      },

      setServingTeam: (team) => {
        const event: MatchEvent = {
          type: 'serving_team_set',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
        };
        set((s) => addEventAndApply(s, event));
      },

      addPoint: (team) => {
        const { matchState } = get();
        const event: MatchEvent = {
          type: 'point',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
          homeScoreBefore: matchState.homeScore,
          awayScoreBefore: matchState.awayScore,
          homeLineupBefore: [...matchState.homeCurrentLineup],
          awayLineupBefore: [...matchState.awayCurrentLineup],
          homeSetterPositionBefore: matchState.homeSetterPosition,
          awaySetterPositionBefore: matchState.awaySetterPosition,
          servingTeamBefore: matchState.servingTeam,
          homeBenchedMbBefore: matchState.homeBenchedMb ?? null,
          awayBenchedMbBefore: matchState.awayBenchedMb ?? null,
        };
        set((s) => addEventAndApply(s, event));
      },

      rotateTeam: (team) => get().addPoint(team),

      endSet: () => {
        const { matchState, homeTeam, awayTeam, homeLineup, awayLineup } = get();
        const homeBase = getLineupNumbers(homeLineup, homeTeam);
        const awayBase = getLineupNumbers(awayLineup, awayTeam);
        const homeLib = homeTeam.players
          .find(p => p.id === homeLineup.libero1)?.number ?? null;
        const awayLib = awayTeam.players
          .find(p => p.id === awayLineup.libero1)?.number ?? null;
        const home = applyLiberoAutoSwap(homeBase, homeTeam, homeLib, null);
        const away = applyLiberoAutoSwap(awayBase, awayTeam, awayLib, null);
        const event: MatchEvent = {
          type: 'set_ended',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          homeLineupNext: home.lineup,
          awayLineupNext: away.lineup,
          homeBenchedMbNext: home.benchedMb,
          awayBenchedMbNext: away.benchedMb,
        };
        set((s) => addEventAndApply(s, event));
        try {
          localStorage.setItem('last_lineup_home',
            JSON.stringify({ lineup: get().homeLineup }));
          localStorage.setItem('last_lineup_away',
            JSON.stringify({ lineup: get().awayLineup }));
        } catch {}
      },

      undoLastAction: () => {
        const { events } = get();
        if (events.length === 0) return;
        const newEvents = events.slice(0, -1);
        set((s) => replaceEventsAndReplay(s, newEvents));
      },

      undoRally: () => {
        const { events, matchState } = get();
        const currentRallyId = `${matchState.currentSet}-${matchState.homeScore}-${matchState.awayScore}`;
        const newEvents = events.filter(e =>
          !(e.type === 'touch' &&
            (e as TouchEvent).rallyId === currentRallyId)
        );
        const removed = events.length - newEvents.length;
        if (removed === 0) return 0;
        set((s) => replaceEventsAndReplay(s, newEvents));
        return removed;
      },

      substitutePlayer: (team, outNumber, inNumber) => {
        const { matchState } = get();
        const usedKey = team === 'home'
          ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
        let libere = false;
        try {
          libere = !!JSON.parse(
            localStorage.getItem('scout_settings') || '{}',
          ).sostituzioniLibere;
        } catch {}
        if (!libere && matchState[usedKey] >= 6) {
          toast.error('Limite sostituzioni raggiunto (6/6)');
          return;
        }
        const event: MatchEvent = {
          type: 'substitution',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
          playerOut: outNumber,
          playerIn: inNumber,
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          countTowardsLimit: !libere,
        };
        set((s) => addEventAndApply(s, event));
      },

      doubleSwitch51: (team) => {
        const { matchState, homeTeam, awayTeam } = get();
        const teamData = team === 'home' ? homeTeam : awayTeam;
        const lineupKey = team === 'home'
          ? 'homeCurrentLineup' : 'awayCurrentLineup';
        const usedKey = team === 'home'
          ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
        const onCourt = matchState[lineupKey];
        const setterOnCourt = onCourt.find(n =>
          teamData.players.find(p => p.number === n)?.role === 'S');
        const oppOnCourt = onCourt.find(n =>
          teamData.players.find(p => p.number === n)?.role === 'OP');
        const reserveOpp = teamData.players
          .find(p => p.role === 'OP' && !onCourt.includes(p.number));
        const reserveSetter = teamData.players
          .find(p => p.role === 'S' && !onCourt.includes(p.number));
        if (!setterOnCourt || !oppOnCourt || !reserveOpp || !reserveSetter) {
          toast.error('Doppio cambio: servono S e OP in campo + riserve');
          return;
        }
        let libere = false;
        try {
          libere = !!JSON.parse(
            localStorage.getItem('scout_settings') || '{}',
          ).sostituzioniLibere;
        } catch {}
        if (!libere && matchState[usedKey] >= 5) {
          toast.error('Sostituzioni insufficienti per doppio cambio');
          return;
        }
        const base = {
          timestamp: nowTime(),
          team,
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          countTowardsLimit: !libere,
        };
        const ev1: MatchEvent = {
          ...base, type: 'substitution',
          id: crypto.randomUUID(),
          playerOut: setterOnCourt, playerIn: reserveOpp.number,
        };
        const ev2: MatchEvent = {
          ...base, type: 'substitution',
          id: crypto.randomUUID(),
          playerOut: oppOnCourt, playerIn: reserveSetter.number,
        };
        set((s) => {
          const s1 = addEventAndApply(s, ev1);
          const s2 = addEventAndApply({ ...s, ...s1 } as MatchStore, ev2);
          return {
            events: s2.events,
            matchState: s2.matchState,
          };
        });
        toast.success(
          `Doppio cambio: #${setterOnCourt}→#${reserveOpp.number}, ` +
          `#${oppOnCourt}→#${reserveSetter.number}`,
        );
      },

      validateLineup: (team) => {
        const { matchState, homeTeam, awayTeam } = get();
        const lineup = team === 'home'
          ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
        const teamData = team === 'home' ? homeTeam : awayTeam;
        const errors: string[] = [];
        if (lineup.length !== 6)
          errors.push('Formazione incompleta (servono 6 giocatori)');
        const seen = new Set<number>();
        for (const n of lineup) {
          if (!n) { errors.push('Posizione vuota nella formazione'); continue; }
          if (seen.has(n)) errors.push(`#${n} presente in più posizioni`);
          seen.add(n);
        }
        const roleOf = (n: number) =>
          teamData.players.find(p => p.number === n)?.role;
        const liberoFront = [1, 2, 3].some(idx =>
          roleOf(lineup[idx] ?? 0) === 'L');
        if (liberoFront) errors.push('Libero in prima linea (illegale)');
        const onCourtRoles = lineup.map(n => roleOf(n)).filter(Boolean);
        if (!onCourtRoles.includes('S'))
          errors.push('Nessun palleggiatore in campo');
        const opposites: [number, number][] = [[0, 3], [1, 4], [2, 5]];
        const isOppositePair = (a: number, b: number) =>
          opposites.some(([x, y]) =>
            (a === x && b === y) || (a === y && b === x));
        const findIdxByRole = (role: string) =>
          lineup.map((n, i) => roleOf(n) === role ? i : -1).filter(i => i >= 0);
        const sIdx = findIdxByRole('S');
        const opIdx = findIdxByRole('OP');
        if (sIdx.length === 2 && !isOppositePair(sIdx[0], sIdx[1]))
          errors.push('I due palleggiatori non sono in posizioni opposte');
        if (sIdx.length === 1 && opIdx.length === 1
          && !isOppositePair(sIdx[0], opIdx[0]))
          errors.push('Palleggiatore e opposto non in posizioni opposte');
        const mIdx = findIdxByRole('M');
        if (mIdx.length === 2 && !isOppositePair(mIdx[0], mIdx[1]))
          errors.push('I due centrali non sono in posizioni opposte');
        const oIdx = findIdxByRole('O');
        if (oIdx.length === 2 && !isOppositePair(oIdx[0], oIdx[1]))
          errors.push('I due schiacciatori non sono in posizioni opposte');
        return errors;
      },

      callTimeout: (team) => {
        const { matchState } = get();
        const usedKey = team === 'home'
          ? 'homeTimeoutsUsed' : 'awayTimeoutsUsed';
        if (matchState[usedKey] >= 2) return false;
        const event: MatchEvent = {
          type: 'timeout',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
        };
        set((s) => addEventAndApply(s, event));
        return true;
      },

      addSanction: (team, type, playerNumber, note) => {
        const { matchState } = get();
        const event: MatchEvent = {
          type: 'sanction',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          team,
          sanctionType: type,
          playerNumber,
          note,
          setNumber: matchState.currentSet,
        };
        set((s) => addEventAndApply(s, event));
      },

      removeSanction: (id) => {
        const newEvents = get().events.filter(e => e.id !== id);
        set((s) => replaceEventsAndReplay(s, newEvents));
      },

      resetMatch: () => set({
        step: 'setup',
        matchInfo: { ...defaultMatchInfo },
        homeTeam: { ...defaultTeam, id: 'home', code: 'HOM' },
        awayTeam: { ...defaultTeam, id: 'away', code: 'AWY' },
        homeLineup: { ...defaultLineup },
        awayLineup: { ...defaultLineup },
        events: [],
        matchState: { ...emptyMatchState },
      }),

      loadDemoMatch: () => {
        const mkPlayer = (
          n: number, last: string, first: string,
          role: Player['role'], isLibero = false, isCaptain = false,
        ): Player => ({
          id: `${last.toLowerCase()}-${n}`, number: n,
          lastName: last, firstName: first,
          role, isLibero, isCaptain,
        });
        const homePlayers: Player[] = [
          mkPlayer(1,'Rossi','Marco','S',false,true),
          mkPlayer(4,'Bianchi','Luca','OP'),
          mkPlayer(7,'Verdi','Andrea','O'),
          mkPlayer(9,'Neri','Paolo','O'),
          mkPlayer(11,'Galli','Davide','M'),
          mkPlayer(14,'Costa','Giorgio','M'),
          mkPlayer(2,'Marini','Stefano','L',true),
          mkPlayer(8,'Conti','Federico','O'),
        ];
        const awayPlayers: Player[] = [
          mkPlayer(3,'Ferrari','Alessio','S',false,true),
          mkPlayer(5,'Esposito','Matteo','OP'),
          mkPlayer(6,'Romano','Luigi','O'),
          mkPlayer(10,'Greco','Riccardo','O'),
          mkPlayer(12,'Bruno','Tommaso','M'),
          mkPlayer(15,'Gallo','Simone','M'),
          mkPlayer(13,'Lombardi','Fabio','L',true),
          mkPlayer(17,'Moretti','Nicola','O'),
        ];
        const demoHomeTeam: Team = {
          id: 'home', code: 'CAS', name: 'Casa Volley',
          coach: 'Coach Casa', assistantCoach: '',
          players: homePlayers, color: '#3b82f6',
        };
        const demoAwayTeam: Team = {
          id: 'away', code: 'OSP', name: 'Ospite Volley',
          coach: 'Coach Ospite', assistantCoach: '',
          players: awayPlayers, color: '#ef4444',
        };
        const demoHomeLineup: Lineup = {
          p1: 'rossi-1', p2: 'galli-11', p3: 'neri-9',
          p4: 'bianchi-4', p5: 'costa-14', p6: 'verdi-7',
          libero1: 'marini-2', libero2: null, setter: 'rossi-1',
        };
        const demoAwayLineup: Lineup = {
          p1: 'ferrari-3', p2: 'bruno-12', p3: 'greco-10',
          p4: 'esposito-5', p5: 'gallo-15', p6: 'romano-6',
          libero1: 'lombardi-13', libero2: null, setter: 'ferrari-3',
        };
        const homeBase = getLineupNumbers(demoHomeLineup, demoHomeTeam);
        const awayBase = getLineupNumbers(demoAwayLineup, demoAwayTeam);
        const homeLib = homePlayers.find(p => p.id === 'marini-2')?.number ?? null;
        const awayLib = awayPlayers.find(p => p.id === 'lombardi-13')?.number ?? null;
        const home = applyLiberoAutoSwap(homeBase, demoHomeTeam, homeLib, null);
        const away = applyLiberoAutoSwap(awayBase, demoAwayTeam, awayLib, null);
        const startEvent: MatchEvent = {
          type: 'match_started',
          id: crypto.randomUUID(),
          timestamp: nowTime(),
          homeLineup: home.lineup,
          awayLineup: away.lineup,
          homeSetterPosition: 1,
          awaySetterPosition: 1,
          homeBenchedMb: home.benchedMb,
          awayBenchedMb: away.benchedMb,
          servingTeam: 'home',
        };
        const ctx: ReplayContext = {
          homeTeam: demoHomeTeam, awayTeam: demoAwayTeam,
          homeLineup: demoHomeLineup, awayLineup: demoAwayLineup,
          totalSets: 5,
        };
        const matchState = applyEvent(emptyMatchState, startEvent, ctx);
        set({
          step: 'scout',
          matchInfo: {
            ...defaultMatchInfo,
            league: 'Serie A', venue: 'PalaDemo', city: 'Roma',
            referee1: 'Arbitro 1', referee2: 'Arbitro 2',
            scorer: 'Demo Scout', totalSets: 5,
          },
          homeTeam: demoHomeTeam,
          awayTeam: demoAwayTeam,
          homeLineup: demoHomeLineup,
          awayLineup: demoAwayLineup,
          events: [startEvent],
          matchState,
        });
      },

      homeReceptionFormations: cloneDefaultFormations(),
      awayReceptionFormations: cloneDefaultFormations(),
      setReceptionPosition: (team, setterPosition, slot, coord) => set((s) => {
        const key = team === 'home'
          ? 'homeReceptionFormations' : 'awayReceptionFormations';
        const sp = Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6;
        const sl = Math.min(6, Math.max(1, slot)) as 1|2|3|4|5|6;
        const current = s[key];
        return {
          [key]: {
            ...current,
            [sp]: {
              ...current[sp],
              [sl]: {
                x: Math.max(0, Math.min(100, coord.x)),
                y: Math.max(0, Math.min(100, coord.y)),
              },
            },
          },
        } as Partial<MatchStore>;
      }),
      resetReceptionFormations: (team) => set(() => ({
        [team === 'home'
          ? 'homeReceptionFormations'
          : 'awayReceptionFormations']: cloneDefaultFormations(),
      } as Partial<MatchStore>)),
      homeAttackFormations: cloneDefaultAttackFormations(),
      awayAttackFormations: cloneDefaultAttackFormations(),
      setAttackPosition: (team, setterPosition, slot, coord) => set((s) => {
        const key = team === 'home'
          ? 'homeAttackFormations' : 'awayAttackFormations';
        const sp = Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6;
        const sl = Math.min(6, Math.max(1, slot)) as 1|2|3|4|5|6;
        const current = s[key];
        return {
          [key]: {
            ...current,
            [sp]: {
              ...current[sp],
              [sl]: {
                x: Math.max(0, Math.min(100, coord.x)),
                y: Math.max(0, Math.min(100, coord.y)),
              },
            },
          },
        } as Partial<MatchStore>;
      }),
      resetAttackFormations: (team) => set(() => ({
        [team === 'home'
          ? 'homeAttackFormations'
          : 'awayAttackFormations']: cloneDefaultAttackFormations(),
      } as Partial<MatchStore>)),
      loadReceptionFormations: (team, formations) => set(() => ({
        [team === 'home'
          ? 'homeReceptionFormations'
          : 'awayReceptionFormations']: JSON.parse(JSON.stringify(formations)),
      } as Partial<MatchStore>)),
      loadAttackFormations: (team, formations) => set(() => ({
        [team === 'home'
          ? 'homeAttackFormations'
          : 'awayAttackFormations']: JSON.parse(JSON.stringify(formations)),
      } as Partial<MatchStore>)),

      homeDefenseFormations: cloneDefaultDefenseFormations(),
      awayDefenseFormations: cloneDefaultDefenseFormations(),
      setDefensePosition: (team, setterPosition, slot, coord) => set((s) => {
        const key = team === 'home' ? 'homeDefenseFormations' : 'awayDefenseFormations';
        const sp = Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6;
        const sl = Math.min(6, Math.max(1, slot)) as 1|2|3|4|5|6;
        const current = s[key];
        return {
          [key]: {
            ...current,
            [sp]: {
              ...current[sp],
              [sl]: {
                x: Math.max(0, Math.min(100, coord.x)),
                y: Math.max(0, Math.min(100, coord.y)),
              },
            },
          },
        } as Partial<MatchStore>;
      }),
      resetDefenseFormations: (team) => set(() => ({
        [team === 'home'
          ? 'homeDefenseFormations'
          : 'awayDefenseFormations']: cloneDefaultDefenseFormations(),
      } as Partial<MatchStore>)),
      loadDefenseFormations: (team, formations) => set(() => ({
        [team === 'home'
          ? 'homeDefenseFormations'
          : 'awayDefenseFormations']: JSON.parse(JSON.stringify(formations)),
      } as Partial<MatchStore>)),

      removeLastTouchFromCurrentRally: () => {
        const { events, matchState } = get();
        if (events.length === 0) return false;
        const currentRallyId = `${matchState.currentSet}-${matchState.homeScore}-${matchState.awayScore}`;
        let lastTouchIdx = -1;
        for (let i = events.length - 1; i >= 0; i--) {
          const e = events[i];
          if (e.type === 'touch' && (e as TouchEvent).rallyId === currentRallyId) {
            lastTouchIdx = i;
            break;
          }
          if (e.type === 'point') return false;
        }
        if (lastTouchIdx === -1) return false;
        const hasTerminal = events
          .filter(e => e.type === 'touch' && (e as TouchEvent).rallyId === currentRallyId)
          .some(e => {
            const t = e as TouchEvent;
            return (t.evaluation === '#' && ['S', 'A', 'B'].includes(t.skill))
                || t.evaluation === '=';
          });
        if (hasTerminal) return false;
        const newEvents = [
          ...events.slice(0, lastTouchIdx),
          ...events.slice(lastTouchIdx + 1),
        ];
        set((s) => replaceEventsAndReplay(s, newEvents));
        toast.info('Ultimo tocco rimosso', { duration: 1200 });
        return true;
      },
    }),
    {
      name: 'volley-scout-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        step: state.step,
        matchInfo: state.matchInfo,
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        homeLineup: state.homeLineup,
        awayLineup: state.awayLineup,
        homeReceptionFormations: state.homeReceptionFormations,
        awayReceptionFormations: state.awayReceptionFormations,
        homeAttackFormations: state.homeAttackFormations,
        awayAttackFormations: state.awayAttackFormations,
        homeDefenseFormations: state.homeDefenseFormations,
        awayDefenseFormations: state.awayDefenseFormations,
        events: state.events,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.events && state.events.length > 0) {
          const ctx: ReplayContext = {
            homeTeam: state.homeTeam,
            awayTeam: state.awayTeam,
            homeLineup: state.homeLineup,
            awayLineup: state.awayLineup,
            totalSets: state.matchInfo?.totalSets ?? 5,
          };
          state.matchState = replayMatch(state.events, ctx);
        } else {
          state.matchState = { ...emptyMatchState };
        }
      },
    }
  )
);
