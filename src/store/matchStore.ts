import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Team, Player, MatchInfo, Lineup, MatchState, ScoutAction,
  SetResult, AppStep, SanctionType, Sanction, TimeoutRecord, Evaluation,
} from '@/types/volleyball';
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
  addAction: (action: Omit<ScoutAction, 'id' | 'setNumber' | 'homeScore' | 'awayScore' | 'homeSetterPosition' | 'awaySetterPosition' | 'homeLineup' | 'awayLineup'>) => void;
  updateAction: (id: string, updates: { playerNumber?: number; evaluation?: Evaluation; startZone?: number | null; endZone?: number | null }) => void;
  deleteAction: (id: string) => void;
  setSingleTeamMode: (v: boolean) => void;
  adjustScore: (team: 'home' | 'away', delta: number) => void;
  setServingTeam: (team: 'home' | 'away') => void;
  addPoint: (team: 'home' | 'away') => void;
  rotateTeam: (team: 'home' | 'away') => void;
  endSet: () => void;
  undoLastAction: () => void;
  substitutePlayer: (team: 'home' | 'away', outNumber: number, inNumber: number) => void;

  // New: time-outs and sanctions
  callTimeout: (team: 'home' | 'away') => boolean;
  addSanction: (team: 'home' | 'away', type: SanctionType, playerNumber: number | null, note?: string) => void;
  removeSanction: (id: string) => void;

  // Reset everything (new match)
  resetMatch: () => void;

  // Load a fully-configured demo match (for quick testing/onboarding)
  loadDemoMatch: () => void;
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
};

const nowTime = () => new Date().toTimeString().slice(0, 8);

type LineupSnapshot = Pick<MatchState, 'homeCurrentLineup' | 'awayCurrentLineup' | 'homeSetterPosition' | 'awaySetterPosition' | 'servingTeam'> & { actionCount: number };
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
        const getLineupNumbers = (lineup: Lineup, team: Team): number[] => {
          const positions = [lineup.p1, lineup.p2, lineup.p3, lineup.p4, lineup.p5, lineup.p6];
          return positions.map(pid => {
            const player = team.players.find(p => p.id === pid);
            return player?.number ?? 0;
          });
        };

        const findSetterPos = (lineup: Lineup): number => {
          const positions = [lineup.p1, lineup.p2, lineup.p3, lineup.p4, lineup.p5, lineup.p6];
          const idx = positions.findIndex(pid => pid === lineup.setter);
          return idx >= 0 ? idx + 1 : 1;
        };

        set({
          matchState: {
            ...defaultMatchState,
            isMatchStarted: true,
            homeCurrentLineup: getLineupNumbers(homeLineup, homeTeam),
            awayCurrentLineup: getLineupNumbers(awayLineup, awayTeam),
            homeSetterPosition: findSetterPos(homeLineup),
            awaySetterPosition: findSetterPos(awayLineup),
            servingTeam: 'home',
          },
        });
      },

      addAction: (actionData) => {
        const { matchState } = get();
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
        const { matchState, matchInfo } = get();
        lineupSnapshots.push({
          homeCurrentLineup: [...matchState.homeCurrentLineup],
          awayCurrentLineup: [...matchState.awayCurrentLineup],
          homeSetterPosition: matchState.homeSetterPosition,
          awaySetterPosition: matchState.awaySetterPosition,
          servingTeam: matchState.servingTeam,
          actionCount: matchState.actions.length,
        });
        const newHomeScore = team === 'home' ? matchState.homeScore + 1 : matchState.homeScore;
        const newAwayScore = team === 'away' ? matchState.awayScore + 1 : matchState.awayScore;

        const maxScore = matchState.currentSet === matchInfo.totalSets ? 15 : 25;
        const isSetOver = (newHomeScore >= maxScore || newAwayScore >= maxScore) &&
          Math.abs(newHomeScore - newAwayScore) >= 2;

        if (isSetOver) {
          // Apply final score before ending the set
          set((s) => ({
            matchState: { ...s.matchState, homeScore: newHomeScore, awayScore: newAwayScore },
          }));
          get().endSet();
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
            const lineup = [...newState[lineupKey]];
            const first = lineup[0];
            for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
            lineup[5] = first;

            const currentSetterPos = newState[setterPosKey];
            const newSetterPos = currentSetterPos === 1 ? 6 : currentSetterPos - 1;

            newState[lineupKey] = lineup;
            newState[setterPosKey] = newSetterPos;
          }

          return { matchState: newState };
        });
      },

      rotateTeam: (team) => set((s) => {
        const lineupKey = team === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
        const setterPosKey = team === 'home' ? 'homeSetterPosition' : 'awaySetterPosition';
        const lineup = [...s.matchState[lineupKey]];
        const first = lineup[0];
        for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
        lineup[5] = first;
        const currentSetterPos = s.matchState[setterPosKey];
        const newSetterPos = currentSetterPos === 1 ? 6 : currentSetterPos - 1;
        return {
          matchState: { ...s.matchState, [lineupKey]: lineup, [setterPosKey]: newSetterPos },
        };
      }),

      endSet: () => set((s) => {
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
            // Reset time-outs at start of new set
            homeTimeoutsUsed: isMatchOver ? s.matchState.homeTimeoutsUsed : 0,
            awayTimeoutsUsed: isMatchOver ? s.matchState.awayTimeoutsUsed : 0,
            homeSubstitutionsUsed: 0,
            awaySubstitutionsUsed: 0,
          },
        };
      }),

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
            } : {}),
            actions: s.matchState.actions.slice(0, -1),
          },
        };
      }),

      substitutePlayer: (team, outNumber, inNumber) => set((s) => {
        const lineupKey = team === 'home' ? 'homeCurrentLineup' : 'awayCurrentLineup';
        const usedKey = team === 'home' ? 'homeSubstitutionsUsed' : 'awaySubstitutionsUsed';
        const lineup = [...s.matchState[lineupKey]];
        const idx = lineup.indexOf(outNumber);
        if (idx >= 0) lineup[idx] = inNumber;
        return { matchState: { ...s.matchState, [lineupKey]: lineup, [usedKey]: s.matchState[usedKey] + 1 } };
      }),

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
    }),
    {
      name: 'volley-scout-storage-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
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
    }
  )
);
