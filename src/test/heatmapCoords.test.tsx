import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeatmapTab } from '@/components/analysis/HeatmapTab';
import type { DbAction } from '@/lib/scoutAnalysis';

const mk = (o: Partial<DbAction>): DbAction => ({
  id: Math.random().toString(36), scout_match_id: 'm', scout_team_id: 'T', side: 'home',
  set_number: 1, rally_index: 1, action_index: 0, player_number: 1, skill: 'S', skill_type: null,
  evaluation: '+', start_zone: null, end_zone: 1, end_subzone: null, attack_combo: null,
  home_score: 0, away_score: 0, home_rotation: null, away_rotation: null,
  home_setter_pos: 1, away_setter_pos: 1, serving_side: 'home', ...o,
});

describe('HeatmapTab con coordinate reali', () => {
  it('mostra lo scatter per la battuta quando le coordinate di arrivo ci sono', () => {
    const actions = [
      mk({ end_x: 0.8, end_y: 0.1 }), mk({ end_x: 0.3, end_y: 0.2 }), mk({ end_x: 0.5, end_y: 0.4 }),
    ];
    const { container } = render(<HeatmapTab actions={actions} forcedSkills={['S']} />);
    expect(screen.getByText(/Scatter — coordinate reali/i)).toBeTruthy();
    expect(screen.getByText(/3 azioni con coordinate precise/i)).toBeTruthy();
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBe(3);
    // y=0.1 (fondo campo Ospite) sta nella metà alta (sopra la rete, y=82.5)
    const cy = Number(circles[0].getAttribute('cy'));
    expect(cy).toBeLessThan(82.5);
  });

  it('senza coordinate non mostra lo scatter', () => {
    render(<HeatmapTab actions={[mk({}), mk({})]} forcedSkills={['S']} />);
    expect(screen.queryByText(/Scatter — coordinate reali/i)).toBeNull();
  });

  it('attacco: usa le coordinate di caduta (landing) nella modalità "punto di caduta"', () => {
    const actions = [
      mk({ skill: 'A', landing_zone: 1, landing_x: 0.7, landing_y: 0.9 }),
      mk({ skill: 'A', landing_zone: 5, landing_x: 0.2, landing_y: 0.8 }),
      mk({ skill: 'A', landing_zone: 6, landing_x: 0.5, landing_y: 0.7 }),
    ];
    const { container } = render(<HeatmapTab actions={actions} forcedSkills={['A']} />);
    fireEvent.click(screen.getByRole('button', { name: /punto di caduta/i }));
    expect(screen.getByText(/3 azioni con coordinate precise/i)).toBeTruthy();
    expect(container.querySelectorAll('svg circle').length).toBe(3);
  });
});
