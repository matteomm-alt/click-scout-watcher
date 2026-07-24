import { describe, it, expect } from 'vitest';
import { suggestNextTouch, SKILL_BANNER } from '@/lib/scoutSuggestions';

describe('suggestNextTouch', () => {
  describe('case A - attack follow-up', () => {
    it('returns S for the opponent team when prevEvaluation is "=" (error)', () => {
      const result = suggestNextTouch('A', 'home', '=', false, 'home');
      expect(result).toEqual({ skill: 'S', team: 'away' });
    });

    it('returns S for the opponent team when prevEvaluation is "/" (out)', () => {
      const result = suggestNextTouch('A', 'away', '/', false, 'home');
      expect(result).toEqual({ skill: 'S', team: 'home' });
    });

    it('returns S for the attacking team when prevEvaluation is "#" (kill)', () => {
      const result = suggestNextTouch('A', 'home', '#', false, 'away');
      expect(result).toEqual({ skill: 'S', team: 'home' });
    });

    it('returns null skill and opponent team during an ongoing rally', () => {
      const result = suggestNextTouch('A', 'home', '+', false, 'home');
      expect(result).toEqual({ skill: null, team: 'away' });
    });

    it('returns null skill and opponent team for any non-terminal evaluation', () => {
      const evaluations = ['-', '!', '?', ''];
      evaluations.forEach((evaluation) => {
        const result = suggestNextTouch('A', 'away', evaluation, false, 'home');
        expect(result).toEqual({ skill: null, team: 'home' });
      });
    });
  });

  describe('SKILL_BANNER', () => {
    it('has a label for each skill', () => {
      const skills = ['S', 'R', 'E', 'A', 'B', 'D', 'F'] as const;
      skills.forEach((skill) => {
        expect(SKILL_BANNER[skill]).toBeTruthy();
      });
    });
  });
});
