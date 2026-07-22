import { describe, it, expect } from 'vitest';
import {
  statsBySkill,
  statsByPlayer,
  zoneStats,
  rotationStats,
  setsTimeline,
  rotationOf,
  phaseOf,
  type DbAction,
} from '@/lib/scoutAnalysis';

function makeAction(overrides: Partial<DbAction> = {}): DbAction {
  return {
    id: safeUUID(),
    scout_match_id: 'm1',
    scout_team_id: 'home-team',
    side: 'home',
    set_number: 1,
    rally_index: 1,
    action_index: 0,
    player_number: 10,
    skill: 'A',
    skill_type: 'H',
    evaluation: '#',
    start_zone: 4,
    end_zone: 5,
    end_subzone: null,
    attack_combo: null,
    home_score: 0,
    away_score: 0,
    home_rotation: [1, 2, 3, 4, 5, 6],
    away_rotation: [1, 2, 3, 4, 5, 6],
    home_setter_pos: 1,
    away_setter_pos: 1,
    serving_side: 'home',
    ...overrides,
  };
}

describe('scoutAnalysis', () => {
  describe('statsBySkill', () => {
    it('calcola efficienza, positività ed errori', () => {
      const actions: DbAction[] = [
        makeAction({ skill: 'A', evaluation: '#' }),
        makeAction({ skill: 'A', evaluation: '+' }),
        makeAction({ skill: 'A', evaluation: '=' }),
        makeAction({ skill: 'A', evaluation: '!' }),
      ];
      const stats = statsBySkill(actions);
      const a = stats.find(s => s.skill === 'A')!;
      expect(a.total).toBe(4);
      expect(a.perfect).toBe(1);
      expect(a.positive).toBe(2);
      expect(a.errors).toBe(1);
      expect(a.efficiency).toBe(0); // (1-1)/4 = 0
      expect(a.positivePct).toBe(50);
      expect(a.errorPct).toBe(25);
    });

    it('ordina per total decrescente', () => {
      const actions: DbAction[] = [
        makeAction({ skill: 'A' }),
        makeAction({ skill: 'B' }),
        makeAction({ skill: 'B' }),
        makeAction({ skill: 'B' }),
      ];
      const stats = statsBySkill(actions);
      expect(stats[0].skill).toBe('B');
      expect(stats[1].skill).toBe('A');
    });
  });

  describe('statsByPlayer', () => {
    it('aggrega per numero maglia ignorando azioni senza numero', () => {
      const actions: DbAction[] = [
        makeAction({ player_number: 7, skill: 'A' }),
        makeAction({ player_number: 7, skill: 'A' }),
        makeAction({ player_number: 12, skill: 'B' }),
        makeAction({ player_number: null }),
      ];
      const stats = statsByPlayer(actions);
      expect(stats).toHaveLength(2);
      expect(stats[0].number).toBe(7);
      expect(stats[0].total).toBe(2);
      expect(stats[0].bySkill.A).toBeDefined();
    });
  });

  describe('zoneStats', () => {
    it('produce sempre 9 celle anche con dati parziali', () => {
      const stats = zoneStats([makeAction({ start_zone: 4 })], 'start');
      expect(stats).toHaveLength(9);
      const z4 = stats.find(s => s.zone === 4)!;
      expect(z4.total).toBe(1);
      expect(z4.perfect).toBe(1);
    });

    it('ignora zone fuori range', () => {
      const stats = zoneStats([makeAction({ start_zone: 99 })], 'start');
      expect(stats.every(s => s.total === 0)).toBe(true);
    });
  });

  describe('rotationOf / phaseOf', () => {
    it('usa setter_pos quando presente', () => {
      const a = makeAction({ home_setter_pos: 3 });
      expect(rotationOf(a, 'home')).toBe(3);
    });
    it('fa fallback su rotation[0]', () => {
      const a = makeAction({ home_setter_pos: null, home_rotation: [5, 6, 1, 2, 3, 4] });
      expect(rotationOf(a, 'home')).toBe(5);
    });
    it('K2 quando la squadra serve, K1 quando riceve', () => {
      expect(phaseOf(makeAction({ serving_side: 'home' }), 'home')).toBe('K2');
      expect(phaseOf(makeAction({ serving_side: 'away' }), 'home')).toBe('K1');
      expect(phaseOf(makeAction({ serving_side: null }), 'home')).toBeNull();
    });
  });

  describe('rotationStats', () => {
    it('calcola sideout% per rotazioni della squadra', () => {
      // Rally 1: home in ricezione, vince con attacco kill
      // Rally 2: home in battuta, perde (avversario kill)
      const actions: DbAction[] = [
        makeAction({ rally_index: 1, serving_side: 'away', skill: 'R', evaluation: '+', home_setter_pos: 1 }),
        makeAction({ rally_index: 1, serving_side: 'away', skill: 'A', evaluation: '#', home_setter_pos: 1, action_index: 1 }),
        makeAction({ rally_index: 2, serving_side: 'home', skill: 'S', evaluation: '+', home_setter_pos: 6, side: 'home' }),
        makeAction({ rally_index: 2, serving_side: 'home', skill: 'A', evaluation: '#', side: 'away', scout_team_id: 'away-team', home_setter_pos: 6, action_index: 1 }),
      ];
      const rs = rotationStats(actions, 'home-team', { side: 'home' });
      const r1 = rs.find(r => r.setterPos === 1)!;
      expect(r1.receptionRallies).toBe(1);
      expect(r1.receptionWon).toBe(1);
      expect(r1.sideOutPct).toBe(100);
      const r6 = rs.find(r => r.setterPos === 6)!;
      expect(r6.serveRallies).toBe(1);
      expect(r6.serveWon).toBe(0);
      expect(r6.pointWinPct).toBe(0);
    });
  });

  describe('setsTimeline', () => {
    it('crea timeline con punto iniziale 0-0 e cambi punteggio', () => {
      const actions: DbAction[] = [
        makeAction({ set_number: 1, home_score: 1, away_score: 0 }),
        makeAction({ set_number: 1, home_score: 1, away_score: 1, action_index: 1 }),
        makeAction({ set_number: 1, home_score: 1, away_score: 1, action_index: 2 }), // duplicato, no nuovo punto
      ];
      const tl = setsTimeline(actions);
      expect(tl).toHaveLength(1);
      expect(tl[0].points[0]).toEqual({ home: 0, away: 0, lead: 0 });
      expect(tl[0].points).toHaveLength(3); // 0-0, 1-0, 1-1
    });
  });
});
