import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Team, Player, MatchInfo, Lineup, MatchState, ScoutAction,
  SetResult, AppStep, SanctionType, Sanction, TimeoutRecord, Evaluation,
} from '@/types/volleyball';
import {
  cloneDefaultFormations,
  cloneDefaultAttackFormations,
  type ReceptionFormations,
  type Coord,
} from '@/lib/receptionFormations';
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

  matchState: MatchState;
  startMatch: () => void;
  addAction: (action: Omit<ScoutAction, 'id' | 'setNumber' | 'homeScore' | 'awayScore' | 'homeSetterPosition' | 'awaySetterPosition' | 'homeLineup' | 'awayLineup'>) => string;
  updateAction: (id: string, updates: { playerNumber?: number; evaluation?: Evaluation; startZone?: number | null; endZone?: number | null }) => void;
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

  // New: time-outs and sanctions
  callTimeout: (team: 'home' | 'away') => boolean;
  addSanction: (team: 'home' | 'away', type: SanctionType, playerNumber: number | null, note?: string) => void;
  removeSanction: (id: string) => void;

  // Reset everything (new match)
  resetMatch: () => void;

  // Load a fully-configured demo match (for quick testing/onboarding)
  loadDemoMatch: () => void;

  // Schemi di ricezione personalizzati (per setter rotation 1..6)
  homeReceptionFormations: ReceptionFormations;
  awayReceptionFormations: ReceptionFormations;
  setReceptionPosition: (
    team: 'home' | 'away',
    setterPosition: number,
    slot: number,
    coord: Coord
  ) => void;
  resetReceptionFormations: (team: 'home' | 'away') => void;

  homeAttackFormations: ReceptionFormations;
  awayAttackFormations: ReceptionFormations;
  setAttackPosition: (
    team: 'home' | 'away',
    setterPosition: number,
    slot: number,
    coord: Coord
  ) => void;
  resetAttackFormations: (team: 'home' | 'away') => void;
  loadReceptionFormations: (team: 'home' | 'away', formations: ReceptionFormations) => void;
  loadAttackFormations: (team: 'home' | 'away', formations: ReceptionFormations) => void;
}

const defaultMatchInfo: MatchInfo = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  season: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
  league: '',
  phase: '',
  venue: '',
  city: '',
  referee1: '',
  referee2: '',
  scorer: '',
  totalSets: 5,
};

const defaultTeam: Team = {
  id: '',
  code: '',
  name: '',
  coach: '',
  assistantCoach: '',
  players: [],
  color: '#ffffff',
};

const defaultLineup: Lineup = {
  p1: null, p2: null, p3: null, p4: null, p5: null, p6: null,
  libero1: null, libero2: null, setter: null,
};

const defaultMatchState: MatchState = {
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
};

const nowTime = () => new Date().toTimeString().slice(0, 8);

// Auto-swap libero ↔ centrale di seconda linea.
// Ritorna nuovo lineup + il numero del centrale "in panchina" (null se libero non in campo).
const applyLiberoAutoSwap = (
  lineup: number[],
  team: Team,
  liberoNum: number | null | undefined,
  benchedMb: number | null | undefined,
): { lineup: number[]; benchedMb: number | null } => {
  if (!liberoNum) return { lineup: [...lineup], benchedMb: benchedMb ?? null };
  const roleOf = (n: number) => team.players.find((p) => p.number === n)?.role;
  const out = [...lineup];
  let benched: number | null = benchedMb ?? null;
  // Step 1: se il libero è in posizione di prima linea (P2/P3/P4 = idx 1,2,3) → ripristina MB
  const liberoIdx = out.indexOf(liberoNum);
  if (benched != null && liberoIdx >= 0 && [1, 2, 3].includes(liberoIdx)) {
    out[liberoIdx] = benched;
    benched = null;
  }
  // Step 2: se nessun MB in panchina, scambia il MB di seconda linea (P1/P5/P6 = idx 0,4,5) col libero
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
};

const getLineupNumbers = (lineup: Lineup, team: Team): number[] => {
  const positions = [lineup.p1, lineup.p2, lineup.p3, lineup.p4, lineup.p5, lineup.p6];
  return positions.map(pid => {
    const player = team.players.find(p => p.id === pid);
    return player?.number ?? 0;
  });
};

type LineupSnapshot = Pick<MatchState, 'homeCurrentLineup' | 'awayCurrentLineup' | 'homeSetterPosition' | 'awaySetterPosition' | 'servingTeam' | 'homeScore' | 'awayScore'> & { actionCount: number; homeBenchedMb: number | null; awayBenchedMb: number | null };
const lineupSnapshots: LineupSnapshot[] = [];

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      step: 'setup',
      setStep: (step) => set({ step }),

      matchInfo: { ...defaultMatchInfo },
      setMatchInfo: (info) => set((s) => ({ matchInfo: { ...s.matchInfo, ...info } })),

      homeTeam: { ...defaultTeam, id: 'home', code: 'HOM' },
      awayTeam: { ...defaultTeam, id: 'away', code: 'AWY' },
      setHomeTeam: (team) => set((s) => ({ homeTeam: { ...s.homeTeam, ...team } })),
      setAwayTeam: (team) => set((s) => ({ awayTeam: { ...s.awayTeam, ...team } })),

      addPlayer: (side, player) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return { [key]: { ...s[key], players: [...s[key].players, player] } } as Partial<MatchStore>;
      }),
      removePlayer: (side, playerId) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return { [key]: { ...s[key], players: s[key].players.filter(p => p.id !== playerId) } } as Partial<MatchStore>;
      }),
      updatePlayer: (side, playerId, updates) => set((s) => {
        const key = side === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          [key]: {
            ...s[key],
            players: s[key].players.map(p => p.id === playerId ? { ...p, ...updates } : p),
          },
        } as Partial<MatchStore>;
      }),

      homeLineup: { ...defaultLineup },
      awayLineup: { ...defaultLineup },
      setHomeLineup: (lineup) => set((s) => ({ homeLineup: { ...s.homeLineup, ...lineup } })),
      setAwayLineup: (lineup) => set((s) => ({ awayLineup: { ...s.awayLineup, ...lineup } })),

      matchState: { ...defaultMatchState },

      startMatch: () => {
        const { homeLineup, awayLineup, homeTeam, awayTeam } = get();
        const findSetterPos = (lineup: Lineup): number => {
          const positions = [lineup.p1, lineup.p2, lineup.p3, lineup.p4, lineup.p5, lineup.p6];
          const idx = positions.findIndex(pid => pid === lineup.setter);
          return idx >= 0 ? idx + 1 : 1;
        };

        const homeBase = getLineupNumbers(homeLineup, homeTeam);
        const awayBase = getLineupNumbers(awayLineup, awayTeam);
        const homeLib = homeTeam.players.find((p) => p.id === homeLineup.libero1)?.number ?? null;
        const awayLib = awayTeam.players.find((p) => p.id === awayLineup.libero1)?.number ?? null;
        const home = applyLiberoAutoSwap(homeBase, homeTeam, homeLib, null);
        const away = applyLiberoAutoSwap(awayBase, awayTeam, awayLib, null);

        set({
          matchState: {
            ...defaultMatchState,
            isMatchStarted: true,
            homeCurrentLineup: home.lineup,
            awayCurrentLineup: away.lineup,
            homeBenchedMb: home.benchedMb,
            awayBenchedMb: away.benchedMb,
            homeSetterPosition: findSetterPos(homeLineup),
            awaySetterPosition: findSetterPos(awayLineup),
            servingTeam: 'home',
          },
        });
        // Validazione post-start
        try {
          const errs = [
            ...get().validateLineup('home').map((e) => `Casa: ${e}`),
            ...get().validateLineup('away').map((e) => `Ospite: ${e}`),
          ];
          errs.forEach((e) => toast.warning(e, { duration: 4000 }));
        } catch {}
      },

      addAction: (actionData) => {
        const { matchState } = get();
        const rallyId = `${matchState.currentSet}-${matchState.homeScore}-${matchState.awayScore}`;
        const phase: 'K1' | 'K2' = matchState.servingTeam === actionData.team ? 'K2' : 'K1';
        const action: ScoutAction = {
          ...actionData,
          id: crypto.randomUUID(),
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          homeSetterPosition: matchState.homeSetterPosition,
          awaySetterPosition: matchState.awaySetterPosition,
          homeLineup: [...matchState.homeCurrentLineup],
          awayLineup: [...matchState.awayCurrentLineup],
          // Snapshot retrospettivo (Phase 11)
          servingTeam: matchState.servingTeam,
          homeBenchedMb: matchState.homeBenchedMb ?? null,
          awayBenchedMb: matchState.awayBenchedMb ?? null,
          rallyId,
          phase,
        };
        set((s) => {
          const actions = [...s.matchState.actions, action];
          let updated = false;
          try {
            const settingsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('scout_settings') : null;
            const autoCorrelation = settingsRaw ? JSON.parse(settingsRaw).autoCorrelation !== false : true;
            if (autoCorrelation === true) {
              if (action.skill === 'R') {
                const map: Partial<Record<Evaluation, Evaluation>> = { '#': '-', '+': '-', '-': '+', '/': '/', '=': '=' };
                const nextEval = map[action.evaluation];
                const idx = [...actions].reverse().findIndex((a) => a.skill === 'S' && a.setNumber === action.setNumber);
                if (nextEval && idx >= 0) {
                  const realIdx = actions.length - 1 - idx;
                  actions[realIdx] = { ...actions[realIdx], evaluation: nextEval };
                  updated = true;
                }
              }
              if (action.skill === 'B') {
                const map: Partial<Record<Evaluation, Evaluation>> = { '#': '/', '+': '-', '=': '#', '!': '!' };
                const nextEval = map[action.evaluation];
                const idx = [...actions].reverse().findIndex((a) => a.skill === 'A' && a.setNumber === action.setNumber);
                if (nextEval && idx >= 0) {
                  const realIdx = actions.length - 1 - idx;
                  actions[realIdx] = { ...actions[realIdx], evaluation: nextEval };
                  updated = true;
                }
              }
            }
          } catch {}
          if (updated) toast.info('Valutazione aggiornata', { duration: 1500 });
          return { matchState: { ...s.matchState, actions } };
        });
        return action.id;
      },

      updateAction: (id, updates) => set((s) => ({
        matchState: {
          ...s.matchState,
          actions: s.matchState.actions.map((a) => a.id === id ? {
            ...a,
            ...(updates.playerNumber !== undefined ? { playerNumber: updates.playerNumber } : {}),
            ...(updates.evaluation !== undefined ? { evaluation: updates.evaluation } : {}),
            ...(updates.startZone !== undefined ? { startZone: updates.startZone ?? undefined } : {}),
            ...(updates.endZone !== undefined ? { endZone: updates.endZone ?? undefined } : {}),
          } : a),
        },
      })),

      deleteAction: (id) => set((s) => ({
        matchState: { ...s.matchState, actions: s.matchState.actions.filter((a) => a.id !== id) },
      })),

      setSingleTeamMode: (v) => set((s) => ({ matchState: { ...s.matchState, singleTeamMode: v } })),

      adjustScore: (team, delta) => set((s) => {
        const key = team === 'home' ? 'homeScore' : 'awayScore';
        return { matchState: { ...s.matchState, [key]: Math.max(0, s.matchState[key] + delta) } };
      }),

      setServingTeam: (team) => set((s) => ({ matchState: { ...s.matchState, servingTeam: team } })),

      addPoint: (team) => {
        const { matchState, matchInfo, homeTeam, awayTeam, homeLineup, awayLineup } = get();
        lineupSnapshots.push({
          homeCurrentLineup: [...matchState.homeCurrentLineup],
          awayCurrentLineup: [...matchState.awayCurrentLineup],
          homeSetterPosition: matchState.homeSetterPosition,
          awaySetterPosition: matchState.awaySetterPosition,
          servingTeam: matchState.servingTeam,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          homeBenchedMb: matchState.homeBenchedMb ?? null,
          awayBenchedMb: matchState.awayBenchedMb ?? null,
          actionCount: matchState.actions.length,
        });
        const newHomeScore = team === 'home' ? matchState.homeScore + 1 : matchState.homeScore;
        const newAwayScore = team === 'away' ? matchState.awayScore + 1 : matchState.awayScore;

        const maxScore = matchState.currentSet === matchInfo.totalSets ? 15 : 25;
        const isSetOver = (newHomeScore >= maxScore || newAwayScore >= maxScore) &&
          Math.abs(newHomeScore - newAwayScore) >= 2;

        if (isSetOver) {
          set((s) => ({
            matchState: {
              ...s.matchState,
              homeScore: newHomeScore,
              awayScore: newAwayScore,
              setOverPending: true,
            },
          }));
          return;
        }

        const wasServing = matchState.servingTeam;
        const scoringTeam = team;
        const needsRotation = wasServing !== scoringTeam;

        set((s) => {
          const newState = {
            ...s.matchState,
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            servingTeam: scoringTeam,
          };

          if (needsRotation) {
            const lineupKey = scoringTeam === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
            const setterPosKey = scoringTeam === 'home' ? 'homeSetterPosition' : 'awaySetterPosition';
            const benchedKey = scoringTeam === 'home' ? 'homeBenchedMb' : 'awayBenchedMb';
            const teamData = scoringTeam === 'home' ? homeTeam : awayTeam;
            const teamLineup = scoringTeam === 'home' ? homeLineup : awayLineup;
            const lineup = [...newState[lineupKey]];
            const first = lineup[0];
            for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
            lineup[5] = first;

            const currentSetterPos = newState[setterPosKey];
            const newSetterPos = currentSetterPos === 1 ? 6 : currentSetterPos - 1;

            const liberoNum = teamData.players.find((p) => p.id === teamLineup.libero1)?.number ?? null;
            const swapped = applyLiberoAutoSwap(lineup, teamData, liberoNum, newState[benchedKey] ?? null);

            newState[lineupKey] = swapped.lineup;
            newState[benchedKey] = swapped.benchedMb;
            newState[setterPosKey] = newSetterPos;
          }

          return { matchState: newState };
        });
      },

      rotateTeam: (team) => set((s) => {
        const lineupKey = team === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
        const setterPosKey = team === 'home' ? 'homeSetterPosition' : 'awaySetterPosition';
        const benchedKey = team === 'home' ? 'homeBenchedMb' : 'awayBenchedMb';
        const teamData = team === 'home' ? s.homeTeam : s.awayTeam;
        const teamLineup = team === 'home' ? s.homeLineup : s.awayLineup;
        const lineup = [...s.matchState[lineupKey]];
        const first = lineup[0];
        for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
        lineup[5] = first;
        const currentSetterPos = s.matchState[setterPosKey];
        const newSetterPos = currentSetterPos === 1 ? 6 : currentSetterPos - 1;
        const liberoNum = teamData.players.find((p) => p.id === teamLineup.libero1)?.number ?? null;
        const swapped = applyLiberoAutoSwap(lineup, teamData, liberoNum, s.matchState[benchedKey] ?? null);
        return {
          matchState: {
            ...s.matchState,
            [lineupKey]: swapped.lineup,
            [benchedKey]: swapped.benchedMb,
            [setterPosKey]: newSetterPos,
          },
        };
      }),

      endSet: () => {
        set((s) => {
          const setResult: SetResult = {
            homeScore: s.matchState.homeScore,
            awayScore: s.matchState.awayScore,
            duration: 0,
          };
          const newSetResults = [...s.matchState.setResults, setResult];
          const homeWon = s.matchState.homeScore > s.matchState.awayScore;
          const newHomeSetsWon = s.matchState.homeSetsWon + (homeWon ? 1 : 0);
          const newAwaySetsWon = s.matchState.awaySetsWon + (homeWon ? 0 : 1);
          const maxSets = Math.ceil(s.matchInfo.totalSets / 2);
          const isMatchOver = newHomeSetsWon >= maxSets || newAwaySetsWon >= maxSets;

          const homeBase = getLineupNumbers(s.homeLineup, s.homeTeam);
          const awayBase = getLineupNumbers(s.awayLineup, s.awayTeam);
          const homeLib = s.homeTeam.players.find((p) => p.id === s.homeLineup.libero1)?.number ?? null;
          const awayLib = s.awayTeam.players.find((p) => p.id === s.awayLineup.libero1)?.number ?? null;
          const home = applyLiberoAutoSwap(homeBase, s.homeTeam, homeLib, null);
          const away = applyLiberoAutoSwap(awayBase, s.awayTeam, awayLib, null);
          return {
            matchState: {
              ...s.matchState,
              setResults: newSetResults,
              homeSetsWon: newHomeSetsWon,
              awaySetsWon: newAwaySetsWon,
              currentSet: isMatchOver ? s.matchState.currentSet : s.matchState.currentSet + 1,
              homeScore: isMatchOver ? s.matchState.homeScore : 0,
              awayScore: isMatchOver ? s.matchState.awayScore : 0,
              isMatchEnded: isMatchOver,
              homeTimeoutsUsed: isMatchOver ? s.matchState.homeTimeoutsUsed : 0,
              awayTimeoutsUsed: isMatchOver ? s.matchState.awayTimeoutsUsed : 0,
              homeSubstitutionsUsed: 0,
              awaySubstitutionsUsed: 0,
              homeSetterPosition: 1,
              awaySetterPosition: 1,
              homeCurrentLineup: home.lineup,
              awayCurrentLineup: away.lineup,
              homeBenchedMb: home.benchedMb,
              awayBenchedMb: away.benchedMb,
              setOverPending: false,
            },
          };
        });
        try {
          const st = get();
          localStorage.setItem('last_lineup_home', JSON.stringify({ lineup: st.homeLineup }));
          localStorage.setItem('last_lineup_away', JSON.stringify({ lineup: st.awayLineup }));
        } catch {}
      },

      undoLastAction: () => set((s) => {
        const latestSnapshot = lineupSnapshots[lineupSnapshots.length - 1];
        const snapshot = latestSnapshot?.actionCount === s.matchState.actions.length ? lineupSnapshots.pop() : undefined;
        return {
          matchState: {
            ...s.matchState,
            ...(snapshot ? {
              homeCurrentLineup: [...snapshot.homeCurrentLineup],
              awayCurrentLineup: [...snapshot.awayCurrentLineup],
              homeSetterPosition: snapshot.homeSetterPosition,
              awaySetterPosition: snapshot.awaySetterPosition,
              servingTeam: snapshot.servingTeam,
              homeScore: snapshot.homeScore,
              awayScore: snapshot.awayScore,
              homeBenchedMb: snapshot.homeBenchedMb,
              awayBenchedMb: snapshot.awayBenchedMb,
            } : {}),
            actions: s.matchState.actions.slice(0, -1),
          },
        };
      }),

      undoRally: () => {
        const { matchState } = get();
        const acts = matchState.actions;
        // Trova l'inizio del rally corrente: dopo l'ultima azione "terminale"
        // (S/A/B con # = punto, o evaluation = errore, o / murato).
        let startIdx = 0;
        for (let i = acts.length - 1; i >= 0; i--) {
          const a = acts[i];
          const terminal =
            (a.evaluation === '#' && (a.skill === 'S' || a.skill === 'A' || a.skill === 'B')) ||
            a.evaluation === '=' ||
            a.evaluation === '/';
          if (terminal) { startIdx = i + 1; break; }
        }
        const removed = acts.length - startIdx;
        if (removed === 0) return 0;
        for (let k = 0; k < removed; k++) {
          // riusa undoLastAction per ripristinare lineup snapshots correttamente
          get().undoLastAction();
        }
        return removed;
      },

      substitutePlayer: (team, outNumber, inNumber) => {
        const { matchState } = get();
        const usedKey = team === 'home' ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
        // Lettura runtime di sostituzioniLibere (evita dipendenza da hook)
        let libere = false;
        try { libere = !!JSON.parse(localStorage.getItem('scout_settings') || '{}').sostituzioniLibere; } catch {}
        if (!libere && matchState[usedKey] >= 6) {
          toast.error('Limite sostituzioni raggiunto (6/6)');
          return;
        }
        set((s) => {
          const lineupKey = team === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
          const lineup = [...s.matchState[lineupKey]];
          const idx = lineup.indexOf(outNumber);
          if (idx >= 0) lineup[idx] = inNumber;
          return { matchState: { ...s.matchState, [lineupKey]: lineup, [usedKey]: s.matchState[usedKey] + 1 } };
        });
      },

      doubleSwitch51: (team) => {
        const { matchState, homeTeam, awayTeam, homeLineup, awayLineup } = get();
        const teamData = team === 'home' ? homeTeam : awayTeam;
        const teamLineup = team === 'home' ? homeLineup : awayLineup;
        const lineupKey = team === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
        const usedKey = team === 'home' ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
        const onCourt = matchState[lineupKey];

        const setterOnCourt = onCourt.find((n) => teamData.players.find((p) => p.number === n)?.role === 'S');
        const oppOnCourt = onCourt.find((n) => teamData.players.find((p) => p.number === n)?.role === 'OP');

        // Riserva: ruolo opposto a chi è in campo (S↔OP) e non già in lineup
        const reserveOpp = teamData.players.find((p) => p.role === 'OP' && !onCourt.includes(p.number));
        const reserveSetter = teamData.players.find((p) => p.role === 'S' && !onCourt.includes(p.number));

        if (!setterOnCourt || !oppOnCourt || !reserveOpp || !reserveSetter) {
          toast.error('Doppio cambio: servono S e OP in campo + riserve S/OP in panchina');
          return;
        }
        let libere = false;
        try { libere = !!JSON.parse(localStorage.getItem('scout_settings') || '{}').sostituzioniLibere; } catch {}
        if (!libere && matchState[usedKey] >= 5) {
          toast.error('Sostituzioni insufficienti per doppio cambio');
          return;
        }
        set((s) => {
          const lineup = [...s.matchState[lineupKey]];
          const sIdx = lineup.indexOf(setterOnCourt);
          const oIdx = lineup.indexOf(oppOnCourt);
          if (sIdx >= 0) lineup[sIdx] = reserveOpp.number;
          if (oIdx >= 0) lineup[oIdx] = reserveSetter.number;
          return {
            matchState: {
              ...s.matchState,
              [lineupKey]: lineup,
              [usedKey]: s.matchState[usedKey] + (libere ? 0 : 2),
            },
          };
        });
        toast.success(`Doppio cambio: #${setterOnCourt}→#${reserveOpp.number}, #${oppOnCourt}→#${reserveSetter.number}`);
      },

      validateLineup: (team) => {
        const { matchState, homeTeam, awayTeam } = get();
        const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
        const teamData = team === 'home' ? homeTeam : awayTeam;
        const errors: string[] = [];
        if (lineup.length !== 6) errors.push('Formazione incompleta (servono 6 giocatori)');
        const seen = new Set<number>();
        for (const n of lineup) {
          if (!n) { errors.push('Posizione vuota nella formazione'); continue; }
          if (seen.has(n)) errors.push(`#${n} presente in più posizioni`);
          seen.add(n);
        }
        // Overlap/ruoli FIVB: libero MAI in prima linea (P2/P3/P4 = idx 1,2,3)
        const roleOf = (n: number) => teamData.players.find((p) => p.number === n)?.role;
        const liberoFront = [1, 2, 3].some((idx) => {
          const r = roleOf(lineup[idx] ?? 0);
          return r === 'L';
        });
        if (liberoFront) errors.push('Libero in prima linea (illegale)');
        // Roster minimo per 5-1: almeno 1 setter e 1 opposto fra i 6 in campo
        const onCourtRoles = lineup.map((n) => roleOf(n)).filter(Boolean);
        if (!onCourtRoles.includes('S')) errors.push('Nessun palleggiatore in campo');

        // FIVB overlap rotazionale: ruoli "speculari" devono stare in posizioni opposte.
        // Coppie opposte: P1↔P4 (idx 0↔3), P2↔P5 (idx 1↔4), P3↔P6 (idx 2↔5).
        const opposites: [number, number][] = [[0, 3], [1, 4], [2, 5]];
        const findIdxByRole = (role: string) =>
          lineup.map((n, i) => (roleOf(n) === role ? i : -1)).filter((i) => i >= 0);
        const isOppositePair = (a: number, b: number) =>
          opposites.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
        // 2 Setter (5-2) o 1 S + 1 OP (5-1): devono essere in posizioni opposte
        const sIdx = findIdxByRole('S');
        const opIdx = findIdxByRole('OP');
        if (sIdx.length === 2 && !isOppositePair(sIdx[0], sIdx[1])) {
          errors.push('I due palleggiatori non sono in posizioni opposte');
        }
        if (sIdx.length === 1 && opIdx.length === 1 && !isOppositePair(sIdx[0], opIdx[0])) {
          errors.push('Palleggiatore e opposto non in posizioni opposte');
        }
        // 2 centrali devono essere opposti
        const mIdx = findIdxByRole('M');
        if (mIdx.length === 2 && !isOppositePair(mIdx[0], mIdx[1])) {
          errors.push('I due centrali non sono in posizioni opposte');
        }
        // 2 schiacciatori (OH) devono essere opposti
        const oIdx = findIdxByRole('O');
        if (oIdx.length === 2 && !isOppositePair(oIdx[0], oIdx[1])) {
          errors.push('I due schiacciatori non sono in posizioni opposte');
        }
        return errors;
      },

      callTimeout: (team) => {
        const { matchState } = get();
        const usedKey = team === 'home' ? 'homeTimeoutsUsed' : 'awayTimeoutsUsed';
        if (matchState[usedKey] >= 2) return false;
        const record: TimeoutRecord = {
          id: crypto.randomUUID(),
          team,
          setNumber: matchState.currentSet,
          homeScore: matchState.homeScore,
          awayScore: matchState.awayScore,
          timestamp: nowTime(),
        };
        set((s) => ({
          matchState: {
            ...s.matchState,
            [usedKey]: s.matchState[usedKey] + 1,
            timeouts: [...s.matchState.timeouts, record],
          },
        }));
        return true;
      },

      addSanction: (team, type, playerNumber, note) => set((s) => {
        const sanction: Sanction = {
          id: crypto.randomUUID(),
          team,
          type,
          playerNumber,
          setNumber: s.matchState.currentSet,
          timestamp: nowTime(),
          note,
        };
        return {
          matchState: { ...s.matchState, sanctions: [...s.matchState.sanctions, sanction] },
        };
      }),

      removeSanction: (id) => set((s) => ({
        matchState: { ...s.matchState, sanctions: s.matchState.sanctions.filter(x => x.id !== id) },
      })),

      resetMatch: () => {
        lineupSnapshots.length = 0;
        set({
        step: 'setup',
        matchInfo: { ...defaultMatchInfo },
        homeTeam: { ...defaultTeam, id: 'home', code: 'HOM' },
        awayTeam: { ...defaultTeam, id: 'away', code: 'AWY' },
        homeLineup: { ...defaultLineup },
        awayLineup: { ...defaultLineup },
        matchState: { ...defaultMatchState },
        });
      },

      loadDemoMatch: () => {
        const mkPlayer = (n: number, last: string, first: string, role: Player['role'], isLibero = false, isCaptain = false): Player => ({
          id: `${last.toLowerCase()}-${n}`,
          number: n,
          lastName: last,
          firstName: first,
          role,
          isLibero,
          isCaptain,
        });

        const homePlayers: Player[] = [
          mkPlayer(1, 'Rossi',     'Marco',    'S', false, true),
          mkPlayer(4, 'Bianchi',   'Luca',     'OP'),
          mkPlayer(7, 'Verdi',     'Andrea',   'O'),
          mkPlayer(9, 'Neri',      'Paolo',    'O'),
          mkPlayer(11,'Galli',     'Davide',   'M'),
          mkPlayer(14,'Costa',     'Giorgio',  'M'),
          mkPlayer(2, 'Marini',    'Stefano',  'L', true),
          mkPlayer(8, 'Conti',     'Federico', 'O'),
        ];
        const awayPlayers: Player[] = [
          mkPlayer(3, 'Ferrari',   'Alessio',  'S', false, true),
          mkPlayer(5, 'Esposito',  'Matteo',   'OP'),
          mkPlayer(6, 'Romano',    'Luigi',    'O'),
          mkPlayer(10,'Greco',     'Riccardo', 'O'),
          mkPlayer(12,'Bruno',     'Tommaso',  'M'),
          mkPlayer(15,'Gallo',     'Simone',   'M'),
          mkPlayer(13,'Lombardi',  'Fabio',    'L', true),
          mkPlayer(17,'Moretti',   'Nicola',   'O'),
        ];

        const homeTeam: Team = {
          id: 'home', code: 'CAS', name: 'Casa Volley',
          coach: 'Coach Casa', assistantCoach: '', players: homePlayers, color: '#3b82f6',
        };
        const awayTeam: Team = {
          id: 'away', code: 'OSP', name: 'Ospite Volley',
          coach: 'Coach Ospite', assistantCoach: '', players: awayPlayers, color: '#ef4444',
        };

        // Lineup 5-1 classico, rotazione P1:
        //   P1=P (Setter)  P2=C1 (Middle1)  P3=S2 (Outside2)
        //   P4=O (Opposite) P5=C2 (Middle2) P6=S1 (Outside1)
        // Home: S=#1 Rossi, OP=#4 Bianchi, M=#11 Galli/#14 Costa, O=#7 Verdi/#9 Neri
        const homeLineup: Lineup = {
          p1: 'rossi-1',    // Setter
          p2: 'galli-11',   // C1 (Middle 1)
          p3: 'neri-9',     // S2 (Outside 2)
          p4: 'bianchi-4',  // Opposite
          p5: 'costa-14',   // C2 (Middle 2) — sostituito dal libero in seconda linea
          p6: 'verdi-7',    // S1 (Outside 1)
          libero1: 'marini-2', libero2: null, setter: 'rossi-1',
        };
        // Away: S=#3 Ferrari, OP=#5 Esposito, M=#12 Bruno/#15 Gallo, O=#6 Romano/#10 Greco
        const awayLineup: Lineup = {
          p1: 'ferrari-3',  // Setter
          p2: 'bruno-12',   // C1
          p3: 'greco-10',   // S2
          p4: 'esposito-5', // Opposite
          p5: 'gallo-15',   // C2
          p6: 'romano-6',   // S1
          libero1: 'lombardi-13', libero2: null, setter: 'ferrari-3',
        };

        set({
          step: 'scout',
          matchInfo: {
            ...defaultMatchInfo,
            league: 'Serie A',
            venue: 'PalaDemo',
            city: 'Roma',
            referee1: 'Arbitro 1',
            referee2: 'Arbitro 2',
            scorer: 'Demo Scout',
            totalSets: 5,
          },
          homeTeam,
          awayTeam,
          homeLineup,
          awayLineup,
          matchState: {
            ...defaultMatchState,
            isMatchStarted: true,
            // Indici array = posizioni P1..P6 in ordine
            homeCurrentLineup: [1, 11, 9, 4, 14, 7],
            awayCurrentLineup: [3, 12, 10, 5, 15, 6],
            homeSetterPosition: 1,
            awaySetterPosition: 1,
            servingTeam: 'home',
          },
        });
      },

      // === Schemi ricezione 5-1 ===
      homeReceptionFormations: cloneDefaultFormations(),
      awayReceptionFormations: cloneDefaultFormations(),
      setReceptionPosition: (team, setterPosition, slot, coord) => set((s) => {
        const key = team === 'home' ? 'homeReceptionFormations' : 'awayReceptionFormations';
        const sp = Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6;
        const sl = Math.min(6, Math.max(1, slot)) as 1|2|3|4|5|6;
        const current = s[key];
        const updated: ReceptionFormations = {
          ...current,
          [sp]: {
            ...current[sp],
            [sl]: {
              x: Math.max(0, Math.min(100, coord.x)),
              y: Math.max(0, Math.min(100, coord.y)),
            },
          },
        };
        return { [key]: updated } as Partial<MatchStore>;
      }),
      resetReceptionFormations: (team) => set(() => ({
        [team === 'home' ? 'homeReceptionFormations' : 'awayReceptionFormations']: cloneDefaultFormations(),
      } as Partial<MatchStore>)),

      homeAttackFormations: cloneDefaultAttackFormations(),
      awayAttackFormations: cloneDefaultAttackFormations(),
      setAttackPosition: (team, setterPosition, slot, coord) => set((s) => {
        const key = team === 'home' ? 'homeAttackFormations' : 'awayAttackFormations';
        const sp = Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6;
        const sl = Math.min(6, Math.max(1, slot)) as 1|2|3|4|5|6;
        const current = s[key];
        const updated: ReceptionFormations = {
          ...current,
          [sp]: {
            ...current[sp],
            [sl]: {
              x: Math.max(0, Math.min(100, coord.x)),
              y: Math.max(0, Math.min(100, coord.y)),
            },
          },
        };
        return { [key]: updated } as Partial<MatchStore>;
      }),
      resetAttackFormations: (team) => set(() => ({
        [team === 'home' ? 'homeAttackFormations' : 'awayAttackFormations']: cloneDefaultAttackFormations(),
      } as Partial<MatchStore>)),
    }),
    {
      name: 'volley-scout-storage-v1',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      partialize: (state: MatchStore) => {
        // Persisti solo i campi essenziali per ripristinare il setup match.
        // Le azioni e gli snapshot pesanti vengono ricaricati da Supabase.
        const m = state.matchState;
        return {
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
          matchState: {
            currentSet: m.currentSet,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            homeSetsWon: m.homeSetsWon,
            awaySetsWon: m.awaySetsWon,
            setResults: m.setResults,
            servingTeam: m.servingTeam,
            homeSetterPosition: m.homeSetterPosition,
            awaySetterPosition: m.awaySetterPosition,
            homeCurrentLineup: m.homeCurrentLineup,
            awayCurrentLineup: m.awayCurrentLineup,
            isMatchStarted: m.isMatchStarted,
            isMatchEnded: m.isMatchEnded,
            singleTeamMode: m.singleTeamMode,
            homeTimeoutsUsed: m.homeTimeoutsUsed,
            awayTimeoutsUsed: m.awayTimeoutsUsed,
            homeSubstitutionsUsed: m.homeSubstitutionsUsed,
            awaySubstitutionsUsed: m.awaySubstitutionsUsed,
            setOverPending: m.setOverPending,
            homeBenchedMb: m.homeBenchedMb,
            awayBenchedMb: m.awayBenchedMb,
            // azioni, timeouts e sanctions NON persistite (troppo grandi / rumorose)
            actions: [],
            timeouts: [],
            sanctions: [],
          } as MatchState,
        } as unknown as MatchStore;
      },
      // Backwards-compat: ensure new fields exist when loading old persisted state
      migrate: (persisted: unknown) => {
        const p = persisted as { state?: { matchState?: Partial<MatchState> } } | undefined;
        if (p?.state?.matchState) {
          p.state.matchState = {
            ...defaultMatchState,
            ...p.state.matchState,
          } as MatchState;
        }
        return p as never;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<MatchStore> | undefined;
        const persistedMatchState = (persisted?.matchState ?? {}) as Partial<MatchState>;

        return {
          ...currentState,
          ...persisted,
          matchState: {
            ...defaultMatchState,
            ...currentState.matchState,
            ...persistedMatchState,
            actions: Array.isArray(persistedMatchState.actions)
              ? persistedMatchState.actions
              : currentState.matchState.actions,
          },
        } as MatchStore;
      },
    }
  )
);
