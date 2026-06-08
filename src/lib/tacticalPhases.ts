/**
 * Fasi tattiche per ogni squadra durante un rally.
 * Ispirato a OpenVolleyScout tactical-transition.ts
 */

export type TeamTacticalPhase =
  | 'serving_prepare'
  | 'reception'
  | 'after_reception_setter_release'
  | 'side_out_defense'
  | 'side_out_setter_release'
  | 'break_point_defense'
  | 'break_point_setter_release';

export type TeamSide = 'home' | 'away';

export type TeamTacticalPhases = Record<TeamSide, TeamTacticalPhase>;

export type PhaseLayout = 'reception' | 'attack' | 'defense' | 'normal';

export function getPhaseLayout(phase: TeamTacticalPhase): PhaseLayout {
  switch (phase) {
    case 'reception':
      return 'reception';
    case 'after_reception_setter_release':
    case 'side_out_setter_release':
    case 'break_point_setter_release':
      return 'attack';
    case 'side_out_defense':
    case 'break_point_defense':
      return 'defense';
    case 'serving_prepare':
    default:
      return 'normal';
  }
}

export function getInitialPhases(servingTeam: TeamSide): TeamTacticalPhases {
  return {
    [servingTeam]: 'serving_prepare',
    [servingTeam === 'home' ? 'away' : 'home']: 'reception',
  } as TeamTacticalPhases;
}

export function resetPhasesAfterPoint(nextServingTeam: TeamSide): TeamTacticalPhases {
  return getInitialPhases(nextServingTeam);
}

export function getNextPhases(
  phases: TeamTacticalPhases,
  skill: string,
  team: TeamSide,
  evaluation: string,
  prevSkill?: string,
  prevTeam?: TeamSide,
): TeamTacticalPhases {
  const next: TeamTacticalPhases = { ...phases };
  const opp: TeamSide = team === 'home' ? 'away' : 'home';

  if (skill === 'S' && (evaluation === '#' || evaluation === '=')) return next;
  if (skill === 'R' && evaluation === '=' && prevSkill === 'S' && prevTeam !== team) return next;

  if (skill === 'S') {
    next[team] = 'break_point_defense';
    return next;
  }

  if (skill === 'R' && evaluation !== '=') {
    next[team] = 'after_reception_setter_release';
    return next;
  }

  if (skill === 'E') {
    return next;
  }

  if (skill === 'A') {
    if (
      phases[team] === 'after_reception_setter_release' ||
      phases[team] === 'side_out_setter_release'
    ) {
      next[team] = 'side_out_defense';
    } else {
      next[team] = 'break_point_defense';
    }
    next[opp] = 'side_out_defense';
    return next;
  }

  if (skill === 'D') {
    if (
      phases[team] === 'break_point_defense' ||
      phases[team] === 'break_point_setter_release'
    ) {
      next[team] = 'break_point_setter_release';
    } else {
      next[team] = 'side_out_setter_release';
    }
    return next;
  }

  if (skill === 'B') {
    next[opp] = 'side_out_defense';
    return next;
  }

  return next;
}

export function replayPhases(
  servingTeam: TeamSide,
  actions: Array<{ skill: string; team: TeamSide; evaluation: string }>,
): TeamTacticalPhases {
  let phases = getInitialPhases(servingTeam);
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const prev = i > 0 ? actions[i - 1] : undefined;
    phases = getNextPhases(phases, a.skill, a.team, a.evaluation, prev?.skill, prev?.team);
  }
  return phases;
}
