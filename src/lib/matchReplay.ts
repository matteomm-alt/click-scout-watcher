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
  replaceNumbers?: number[],
): { lineup: number[]; benchedMb: number | null } {
  const roleOf = (n: number) => team.players.find((p) => p.number === n)?.role;
  // Giocatrici che il libero può sostituire: scelta in Formazione, altrimenti i centrali.
  const isTarget = (n: number) =>
    replaceNumbers && replaceNumbers.length > 0 ? replaceNumbers.includes(n) : roleOf(n) === 'M';
  const out = [...lineup];
  let benched: number | null = benchedMb ?? null;
  // Posizioni vietate al libero: P1 (battuta) e prima linea P2/P3/P4.
  const ILLEGAL = [0, 1, 2, 3];
  // Non dipendere soltanto dal libero selezionato nella formazione: le rose
  // importate possono indicarlo tramite ruolo/isLibero senza valorizzare
  // libero1. In quel caso va protetto comunque, soprattutto in P1.
  const rosterLiberoNumbers = team.players
    .filter((player) => player.isLibero || player.role === 'L')
    .map((player) => player.number);
  const illegalLiberoNum = out.find((number, index) =>
    ILLEGAL.includes(index) && rosterLiberoNumbers.includes(number),
  );
  const activeLiberoNum = illegalLiberoNum ?? liberoNum ?? null;
  if (!activeLiberoNum) return { lineup: out, benchedMb: benched };

  const liberoIdx = out.indexOf(activeLiberoNum);
  if (benched != null && liberoIdx >= 0 && ILLEGAL.includes(liberoIdx)) {
    out[liberoIdx] = benched;
    benched = null;
  }
  // Regola FIVB: il libero non può MAI stare in prima linea (P2/P3/P4) né in
  // posizione di battuta (P1). Se ci finisce (es. formazione iniziale errata o
  // rotazione), viene scambiato con un giocatore di seconda linea (P5/P6),
  // preferibilmente un centrale.
  let illegalIdx = out.indexOf(activeLiberoNum);
  if (illegalIdx >= 0 && ILLEGAL.includes(illegalIdx)) {
    const backIdx =
      [4, 5].find((i) => out[i] && out[i] !== activeLiberoNum && isTarget(out[i])) ??
      [4, 5].find((i) => out[i] && out[i] !== activeLiberoNum && !rosterLiberoNumbers.includes(out[i]));
    if (backIdx !== undefined) {
      const swapped = out[backIdx];
      out[backIdx] = activeLiberoNum;
      out[illegalIdx] = swapped;
      benched = null;
    }
  }
  // Ultima risorsa: nessuna seconda linea disponibile → il libero esce e
  // rientra un giocatore dalla panchina (preferibilmente un centrale).
  illegalIdx = out.indexOf(activeLiberoNum);
  if (illegalIdx >= 0 && ILLEGAL.includes(illegalIdx)) {
    const onCourt = new Set(out);
    const bench = team.players.filter(
      (p) => !onCourt.has(p.number) && !p.isLibero && p.role !== 'L',
    );
    const replacement = bench.find((p) => p.role === 'M') ?? bench[0];
    if (replacement) out[illegalIdx] = replacement.number;
  }
  if (benched == null && liberoNum != null && !out.includes(liberoNum)) {
    for (const idx of [4, 5]) {
      const num = out[idx];
      if (num && num !== liberoNum && isTarget(num)) {
        benched = num;
        out[idx] = liberoNum;
        break;
      }
    }
  }
  return { lineup: out, benchedMb: benched };
}


export function liberoTargets(team: Team, lineup: Lineup): number[] {
  return (lineup.liberoReplaces ?? [])
    .map((id) => team.players.find((p) => p.id === id)?.number)
    .filter((n): n is number => typeof n === 'number');
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
    homeCourtSide: 'right',
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

// Garanzia finale: qualunque sia l'evento e qualunque sia il lato campo
// scelto per la squadra di casa, il libero non può restare in P1 (battuta)
// né in prima linea. Le posizioni P1–P6 sono sempre relative alla squadra,
// quindi il controllo vale identico con casa a sinistra o a destra.
function enforceLiberoLegality(state: MatchState, ctx: ReplayContext): MatchState {
  if (!state.isMatchStarted) return state;
  let next = state;
  if (state.homeCurrentLineup.length === 6) {
    const liberoNum = ctx.homeTeam.players
      .find((p) => p.id === ctx.homeLineup.libero1)?.number ?? null;
    const legal = applyLiberoAutoSwap(
      state.homeCurrentLineup, ctx.homeTeam, liberoNum, state.homeBenchedMb,
      liberoTargets(ctx.homeTeam, ctx.homeLineup),
    );
    if (legal.lineup.some((n, i) => n !== state.homeCurrentLineup[i])
      || legal.benchedMb !== state.homeBenchedMb) {
      next = { ...next, homeCurrentLineup: legal.lineup, homeBenchedMb: legal.benchedMb };
    }
  }
  if (state.awayCurrentLineup.length === 6) {
    const liberoNum = ctx.awayTeam.players
      .find((p) => p.id === ctx.awayLineup.libero1)?.number ?? null;
    const legal = applyLiberoAutoSwap(
      next.awayCurrentLineup, ctx.awayTeam, liberoNum, next.awayBenchedMb,
      liberoTargets(ctx.awayTeam, ctx.awayLineup),
    );
    if (legal.lineup.some((n, i) => n !== next.awayCurrentLineup[i])
      || legal.benchedMb !== next.awayBenchedMb) {
      next = { ...next, awayCurrentLineup: legal.lineup, awayBenchedMb: legal.benchedMb };
    }
  }
  return next;
}

export function applyEvent(
  state: MatchState,
  event: MatchEvent,
  ctx: ReplayContext,
): MatchState {
  return enforceLiberoLegality(applyEventInternal(state, event, ctx), ctx);
}

function applyEventInternal(
  state: MatchState,
  event: MatchEvent,
  ctx: ReplayContext,
): MatchState {
  switch (event.type) {
    case 'match_started':
      {
        const homeLibero = ctx.homeTeam.players
          .find((player) => player.id === ctx.homeLineup.libero1)?.number ?? null;
        const awayLibero = ctx.awayTeam.players
          .find((player) => player.id === ctx.awayLineup.libero1)?.number ?? null;
        const home = applyLiberoAutoSwap(
          event.homeLineup,
          ctx.homeTeam,
          homeLibero,
          event.homeBenchedMb,
          liberoTargets(ctx.homeTeam, ctx.homeLineup),
        );
        const away = applyLiberoAutoSwap(
          event.awayLineup,
          ctx.awayTeam,
          awayLibero,
          event.awayBenchedMb,
          liberoTargets(ctx.awayTeam, ctx.awayLineup),
        );
      return {
        ...state,
        isMatchStarted: true,
        homeCurrentLineup: home.lineup,
        awayCurrentLineup: away.lineup,
        homeCourtSide: event.homeCourtSide ?? state.homeCourtSide ?? 'right',
        homeSetterPosition: event.homeSetterPosition,
        awaySetterPosition: event.awaySetterPosition,
        homeBenchedMb: home.benchedMb,
        awayBenchedMb: away.benchedMb,
        servingTeam: event.servingTeam,
        teamTacticalPhases: getInitialPhases(event.servingTeam),
      };
      }

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
        landingZone: event.landingZone,
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
            if (idx >= 0) {
              const realIdx = actions.length - 1 - idx;
              const patch: Partial<typeof actions[number]> = {};
              if (nextEval) patch.evaluation = nextEval;
              // La battuta non ha una zona di arrivo propria nel flusso semplificato:
              // coincide con la zona di partenza della ricezione che la segue (stesso
              // punto fisico del campo, visto dai due lati della rete). Non sovrascrive
              // una zona già impostata manualmente (opzione "Zona battuta manuale"),
              // che ha sempre la precedenza sulla deduzione automatica.
              if (action.startZone != null && actions[realIdx].endZone == null) {
                patch.endZone = action.startZone;
              }
              actions[realIdx] = { ...actions[realIdx], ...patch };
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
          // L'Attacco non ha una zona di partenza propria nel flusso semplificato
          // (si tocca solo l'attaccante, la sua posizione diventa endZone). Per
          // ricostruire una traiettoria vera (partenza→arrivo) senza richiedere
          // un secondo tocco, la partenza si deduce dal tocco IMMEDIATAMENTE
          // precedente nello stesso rally che abbia già una zona propria nativa
          // (Ricezione o Difesa — non l'Alzata, che ha solo una zona ereditata
          // e potrebbe non essere ancora stata scritta in questo stesso ciclo).
          // Stesso principio usato da OpenVolleyScout: la partenza di un tocco
          // è il punto del tocco precedente, non un dato richiesto a parte.
          if (action.skill === 'A' && action.startZone == null) {
            const prevTouch = [...actions].reverse().find(a =>
              a.id !== action.id &&
              (a.rallyId && action.rallyId ? a.rallyId === action.rallyId : a.setNumber === action.setNumber) &&
              (a.skill === 'R' || a.skill === 'D' || a.skill === 'A' || a.skill === 'B') &&
              (a.skill === 'R' ? a.startZone != null : a.endZone != null),
            );
            if (prevTouch) {
              const prevZone = prevTouch.skill === 'R' ? prevTouch.startZone : prevTouch.endZone;
              const idx = actions.findIndex(a => a.id === action.id);
              if (idx >= 0) {
                actions[idx] = { ...actions[idx], startZone: prevZone };
              }
            }
          }
        }
      } catch { /* ignore */ }
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
        const swapped = applyLiberoAutoSwap(lineup, teamData, liberoNum, benchedMb, liberoTargets(teamData, teamLineup));
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
      const benchedKey = event.team === 'home'
        ? 'homeBenchedMb' : 'awayBenchedMb';
      const lineup = [...state[lineupKey]];
      const idx = lineup.indexOf(event.playerOut);
      if (idx >= 0) lineup[idx] = event.playerIn;
      const teamData = event.team === 'home' ? ctx.homeTeam : ctx.awayTeam;
      const configuredLineup = event.team === 'home' ? ctx.homeLineup : ctx.awayLineup;
      const liberoNum = teamData.players
        .find((player) => player.id === configuredLineup.libero1)?.number ?? null;
      const legal = applyLiberoAutoSwap(lineup, teamData, liberoNum, state[benchedKey], liberoTargets(teamData, configuredLineup));
      return {
        ...state,
        [lineupKey]: legal.lineup,
        [benchedKey]: legal.benchedMb,
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

    case 'rotation': {
      const teamData = event.team === 'home' ? ctx.homeTeam : ctx.awayTeam;
      const teamLineup = event.team === 'home' ? ctx.homeLineup : ctx.awayLineup;
      const lineup = [...event.lineupBefore];
      const first = lineup[0];
      for (let i = 0; i < 5; i++) lineup[i] = lineup[i + 1];
      lineup[5] = first;
      const newSetterPos = event.setterPositionBefore === 1
        ? 6 : event.setterPositionBefore - 1;
      const liberoNum = teamData.players
        .find(p => p.id === teamLineup.libero1)?.number ?? null;
      const swapped = applyLiberoAutoSwap(
        lineup, teamData, liberoNum, event.benchedMbBefore,
        liberoTargets(teamData, teamLineup),
      );
      if (event.team === 'home') {
        return {
          ...state,
          homeCurrentLineup: swapped.lineup,
          homeSetterPosition: newSetterPos,
          homeBenchedMb: swapped.benchedMb,
        };
      }
      return {
        ...state,
        awayCurrentLineup: swapped.lineup,
        awaySetterPosition: newSetterPos,
        awayBenchedMb: swapped.benchedMb,
      };
    }

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
