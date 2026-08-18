import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useMatchStore } from '@/store/matchStore';
import { suggestNextTouch } from '@/lib/scoutSuggestions';
import { getInitialPhases, getNextPhases, getPhaseLayout, replayPhases } from '@/lib/tacticalPhases';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import type { Player, Lineup, Evaluation } from '@/types/volleyball';

const mkPlayer = (n: number, role: Player['role'], isLib = false): Player => ({
  id: `p${n}`, number: n, lastName: `L${n}`, firstName: 'F', role, isLibero: isLib, isCaptain: false,
});

const roster: Player[] = [
  mkPlayer(1, 'S'), mkPlayer(2, 'M'), mkPlayer(3, 'M'),
  mkPlayer(4, 'O'), mkPlayer(5, 'O'), mkPlayer(6, 'OP'),
  mkPlayer(7, 'L', true),
];

const lineup: Lineup = {
  p1: 'p1', p2: 'p5', p3: 'p2', p4: 'p6', p5: 'p4', p6: 'p3',
  libero1: 'p7', libero2: null, setter: 'p1',
};

function bootstrap() {
  const s = useMatchStore.getState();
  s.resetMatch();
  s.setHomeTeam({ players: roster });
  s.setAwayTeam({ players: roster.map((p) => ({ ...p, id: `a${p.number}` })) });
  s.setHomeLineup(lineup);
  s.setAwayLineup({
    ...lineup,
    p1: 'a1', p2: 'a5', p3: 'a2', p4: 'a6', p5: 'a4', p6: 'a3',
    libero1: 'a7', setter: 'a1',
  });
  s.setServingTeam('home');
  s.startMatch();
}

/** Un tocco della sequenza: quello che l'operatore registra nello scout live. */
type Touch = { team: 'home' | 'away'; playerNumber: number; skill: 'S' | 'R' | 'E' | 'A' | 'B' | 'D' | 'F'; evaluation: Evaluation };

const RALLY: Touch[] = [
  { team: 'home', playerNumber: 1, skill: 'S', evaluation: '+' }, // battuta non conclusiva
  { team: 'away', playerNumber: 4, skill: 'R', evaluation: '#' }, // ricezione perfetta
  { team: 'away', playerNumber: 6, skill: 'A', evaluation: '-' }, // attacco NON conclusivo
  { team: 'home', playerNumber: 5, skill: 'A', evaluation: '#' }, // contrattacco vincente
];

describe('E2E — sequenza battuta → ricezione → attacco non conclusivo → azioni successive', () => {
  beforeEach(() => {
    cleanup();
    bootstrap();
  });

  it('la catena di fondamentali suggeriti resta coerente per tutta la sequenza', () => {
    // Inizio rally: nessun tocco precedente → battuta alla squadra al servizio.
    expect(suggestNextTouch(null, null, null, false, 'home')).toEqual({ skill: 'S', team: 'home' });

    // Dopo battuta non conclusiva → ricezione avversaria.
    expect(suggestNextTouch('S', 'home', '+', false, 'home')).toEqual({ skill: 'R', team: 'away', evaluation: '+' });

    // Dopo la ricezione → attacco della stessa squadra che ha ricevuto.
    expect(suggestNextTouch('R', 'away', '#', false, 'home')).toEqual({ skill: 'A', team: 'away' });

    // Attacco NON conclusivo → la palla passa all'avversario, già in attacco.
    expect(suggestNextTouch('A', 'away', '-', false, 'home')).toEqual({ skill: 'A', team: 'home' });

    // Contrattacco vincente → chi ha fatto punto va al servizio.
    expect(suggestNextTouch('A', 'home', '#', false, 'home')).toEqual({ skill: 'S', team: 'home' });
  });

  it('le fasi tattiche seguono la sequenza e mettono in attacco chi riceve un attacco non conclusivo', () => {
    let phases = getInitialPhases('home');
    expect(phases.home).toBe('serving_prepare');
    expect(getPhaseLayout(phases.away)).toBe('reception');

    phases = getNextPhases(phases, 'S', 'home', '+');
    expect(getPhaseLayout(phases.away)).toBe('reception');

    phases = getNextPhases(phases, 'R', 'away', '#', 'S', 'home');
    expect(getPhaseLayout(phases.away)).toBe('attack');

    // Attacco non conclusivo di away → home passa in schieramento offensivo.
    phases = getNextPhases(phases, 'A', 'away', '-', 'R', 'away');
    expect(getPhaseLayout(phases.home)).toBe('attack');
    expect(getPhaseLayout(phases.away)).toBe('defense');

    // Stesso risultato ripercorrendo l'intero rally.
    const replayed = replayPhases('home', RALLY.slice(0, 3).map((t) => ({ skill: t.skill, team: t.team, evaluation: t.evaluation })));
    expect(replayed).toEqual(phases);
  });

  it('lo store registra i tocchi con rally, fase K1/K2 e rotazioni coerenti', () => {
    const s = useMatchStore.getState();
    RALLY.forEach((t, i) => {
      s.addAction({
        timestamp: `00:00:0${i + 1}`,
        team: t.team,
        playerNumber: t.playerNumber,
        skill: t.skill,
        skillType: 'H',
        evaluation: t.evaluation,
        code: `${t.team === 'home' ? '*' : 'a'}${String(t.playerNumber).padStart(2, '0')}${t.skill}H${t.evaluation}`,
      });
    });

    const { actions } = useMatchStore.getState().matchState;
    expect(actions).toHaveLength(4);
    // Tutti i tocchi appartengono allo stesso rally.
    expect(new Set(actions.map((a) => a.rallyId)).size).toBe(1);
    // Home serve: i suoi tocchi sono break (K2), quelli di away side-out (K1).
    expect(actions.filter((a) => a.team === 'home').every((a) => a.phase === 'K2')).toBe(true);
    expect(actions.filter((a) => a.team === 'away').every((a) => a.phase === 'K1')).toBe(true);
    expect(actions.every((a) => a.servingTeam === 'home')).toBe(true);
    expect(actions.every((a) => a.homeLineup.length === 6 && a.awayLineup.length === 6)).toBe(true);

    // Punto della home (che serviva): nessuna rotazione, continua al servizio.
    const homeBefore = useMatchStore.getState().matchState.homeCurrentLineup.slice();
    useMatchStore.getState().addPoint('home');
    const after = useMatchStore.getState().matchState;
    expect(after.homeCurrentLineup).toEqual(homeBefore);
    expect(after.servingTeam).toBe('home');
    expect(after.homeScore).toBe(1);
  });

  it('il libero non resta mai in posizione 1 nella squadra al servizio', () => {
    for (let i = 0; i < 6; i++) {
      const st = useMatchStore.getState().matchState;
      const serving = st.servingTeam;
      const lineupNums = serving === 'home' ? st.homeCurrentLineup : st.awayCurrentLineup;
      const players = serving === 'home' ? roster : roster;
      const p1 = players.find((p) => p.number === lineupNums[0]);
      expect(p1?.isLibero).not.toBe(true);
      useMatchStore.getState().addPoint(i % 2 === 0 ? 'away' : 'home');
    }
  });

  it('la UI del campo mostra entrambe le formazioni dopo la sequenza', () => {
    const s = useMatchStore.getState();
    RALLY.forEach((t, i) => {
      s.addAction({
        timestamp: `00:00:0${i + 1}`,
        team: t.team,
        playerNumber: t.playerNumber,
        skill: t.skill,
        skillType: 'H',
        evaluation: t.evaluation,
        code: `x${i}`,
      });
    });

    render(<VolleyballCourt />);
    const st = useMatchStore.getState().matchState;
    // Ogni numero in campo (home + away) è renderizzato almeno una volta.
    [...st.homeCurrentLineup, ...st.awayCurrentLineup].forEach((num) => {
      expect(screen.getAllByText(String(num)).length).toBeGreaterThan(0);
    });
  });
});
