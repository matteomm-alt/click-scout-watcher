import type { Skill } from '@/types/volleyball';

export interface TouchSuggestion {
  skill: Skill | null;
  team: 'home' | 'away' | null;
}

export function suggestNextTouch(
  prevSkill: Skill | null,
  prevTeam: 'home' | 'away' | null,
  prevEvaluation: string | null,
  simpleMode: boolean,
  servingTeam: 'home' | 'away',
): TouchSuggestion {
  if (!prevSkill || !prevTeam) return { skill: 'S', team: servingTeam };
  const opp: 'home' | 'away' = prevTeam === 'home' ? 'away' : 'home';

  switch (prevSkill) {
    case 'S':
      if (prevEvaluation === '#' || prevEvaluation === '=') return { skill: null, team: null };
      return { skill: 'R', team: opp };
    case 'R':
      if (prevEvaluation === '=') return { skill: 'F', team: prevTeam };
      if (simpleMode) return { skill: 'A', team: prevTeam };
      return { skill: 'E', team: prevTeam };
    case 'E':
      return { skill: 'A', team: prevTeam };
    case 'A':
      if (prevEvaluation === '#' || prevEvaluation === '=') return { skill: null, team: null };
      if (simpleMode) return { skill: 'R', team: opp };
      return { skill: 'D', team: opp };
    case 'B':
      if (prevEvaluation === '#') return { skill: null, team: null };
      return { skill: 'D', team: prevTeam };
    case 'D':
      if (simpleMode) return { skill: 'A', team: prevTeam };
      return { skill: 'E', team: prevTeam };
    case 'F':
      return { skill: 'R', team: opp };
    default:
      return { skill: null, team: null };
  }
}

export const SKILL_BANNER: Record<Skill, string> = {
  S: '🏐 Battuta',
  R: '↙ Ricezione',
  E: '↑ Alzata',
  A: '↗ Attacco',
  B: '✋ Muro',
  D: '🛡 Difesa',
  F: '↔ Freeball',
};
