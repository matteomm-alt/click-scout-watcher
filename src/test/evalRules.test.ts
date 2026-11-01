import { describe, it, expect } from 'vitest';
import { isErrorEval, rallyWinnerSide } from '@/lib/evalRules';
import { statsBySkill, rotationStats, type DbAction } from '@/lib/scoutAnalysis';

const act = (o: Partial<DbAction>): DbAction => ({
  id: Math.random().toString(36), scout_match_id: 'm', scout_team_id: 'T', side: 'home',
  set_number: 1, rally_index: 1, action_index: 0, player_number: 1, skill: 'A', skill_type: null,
  evaluation: '+', start_zone: null, end_zone: null, end_subzone: null, attack_combo: null,
  home_score: 0, away_score: 0, home_rotation: null, away_rotation: null,
  home_setter_pos: 1, away_setter_pos: 1, serving_side: 'home', ...o,
});

describe('regole valutazione /', () => {
  it('= è errore ovunque; / solo per Attacco e Muro', () => {
    for (const sk of ['S', 'R', 'E', 'A', 'B', 'D', 'F']) expect(isErrorEval(sk, '=')).toBe(true);
    expect(isErrorEval('A', '/')).toBe(true);
    expect(isErrorEval('B', '/')).toBe(true);
    for (const sk of ['S', 'R', 'E', 'D', 'F']) expect(isErrorEval(sk, '/')).toBe(false);
  });

  it('statsBySkill: S/ è positiva e non errore', () => {
    const st = statsBySkill([
      act({ skill: 'S', evaluation: '#' }),
      act({ skill: 'S', evaluation: '/' }),
      act({ skill: 'S', evaluation: '=' }),
      act({ skill: 'S', evaluation: '-' }),
    ])[0];
    expect(st.total).toBe(4);
    expect(st.errors).toBe(1);
    expect(st.positive).toBe(2); // # e /
    expect(st.perfect).toBe(1);
  });

  it('statsBySkill: attacco murato / è errore, ricezione / no', () => {
    const a = statsBySkill([act({ skill: 'A', evaluation: '/' })])[0];
    const r = statsBySkill([act({ skill: 'R', evaluation: '/' })])[0];
    expect(a.errors).toBe(1);
    expect(r.errors).toBe(0);
  });

  it('vincitore del rally: S/ non chiude, A# sì; A/ regala il punto', () => {
    const rally1 = [
      act({ skill: 'S', evaluation: '/', side: 'home', action_index: 0 }),
      act({ skill: 'R', evaluation: '/', side: 'away', action_index: 1 }),
      act({ skill: 'A', evaluation: '#', side: 'home', action_index: 2, home_score: 1 }),
    ];
    expect(rallyWinnerSide(rally1)).toBe('home');
    const rally2 = [
      act({ skill: 'S', evaluation: '+', side: 'home', action_index: 0 }),
      act({ skill: 'R', evaluation: '+', side: 'away', action_index: 1 }),
      act({ skill: 'A', evaluation: '/', side: 'away', action_index: 2 }),
    ];
    expect(rallyWinnerSide(rally2)).toBe('home');
  });

  it('rotationStats: un servizio / non assegna il punto a chi riceve', () => {
    const rally = [
      act({ skill: 'S', evaluation: '/', side: 'home', action_index: 0, home_score: 1, away_score: 0 }),
      act({ skill: 'R', evaluation: '/', side: 'away', scout_team_id: 'O', action_index: 1, home_score: 1, away_score: 0 }),
    ];
    const rs = rotationStats(rally, 'T', { side: 'home' });
    const tot = rs.reduce((n, r) => n + r.pointsWon, 0);
    expect(tot).toBe(1); // punto a casa (ultima azione con home_score 1-0), non all'avversario
  });
});
