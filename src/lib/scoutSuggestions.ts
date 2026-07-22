import type { Skill, Evaluation } from '@/types/volleyball';

export interface TouchSuggestion {
  skill: Skill | null;
  team: 'home' | 'away' | null;
  evaluation?: Evaluation | null;
  playerNumber?: number | null;
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
      return { skill: 'R', team: opp, evaluation: '+' };
    case 'R':
      if (prevEvaluation === '=') return { skill: 'F', team: prevTeam };
      return { skill: 'A', team: prevTeam };
    case 'E':
      return { skill: 'A', team: prevTeam };
    case 'A':
      // Kill: la squadra attaccante ha fatto punto → serve al tocco successivo.
      if (prevEvaluation === '#') return { skill: 'S', team: prevTeam };
      // Errore o out: punto avversario → l'avversario serve.
      if (prevEvaluation === '=' || prevEvaluation === '/') return { skill: 'S', team: opp };
      return { skill: 'A', team: opp };
    case 'B':
      if (prevEvaluation === '#') return { skill: null, team: null };
      return { skill: 'A', team: prevTeam };
    case 'D':
      return { skill: 'A', team: prevTeam };
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
