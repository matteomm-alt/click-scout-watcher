import { describe, it, expect } from 'vitest';
import { generateDVW } from '@/lib/dvwExporter';
import type { MatchInfo, Team, Lineup, ScoutAction, SetResult } from '@/types/volleyball';

const matchInfo: MatchInfo = {
  date: '2026-05-18', time: '20:30', season: '2025/2026',
  league: 'Serie A', phase: 'Regular Season',
  venue: 'Palazzetto', city: 'Roma',
  referee1: 'Rossi', referee2: 'Bianchi', scorer: 'Verdi', totalSets: 5,
};

const home: Team = {
  id: 'h', code: 'HOM', name: 'Casa', coach: 'C1', assistantCoach: '',
  color: '#fff',
  players: [
    { id: 'h1', number: 1, lastName: 'Setter', firstName: 'S', role: 'S', isLibero: false, isCaptain: true },
    { id: 'h2', number: 2, lastName: 'Mid', firstName: 'M', role: 'M', isLibero: false, isCaptain: false },
  ],
};
const away: Team = { ...home, id: 'a', code: 'AWY', name: 'Ospite' };

const lineup: Lineup = {
  p1: 'h1', p2: 'h2', p3: 'h1', p4: 'h2', p5: 'h1', p6: 'h2',
  libero1: null, libero2: null, setter: 'h1',
};

describe('dvwExporter', () => {
  it('genera header DVW con sezioni obbligatorie', () => {
    const out = generateDVW(matchInfo, home, away, lineup, lineup, [], [], 0, 0);
    expect(out).toContain('[3DATAVOLLEYSCOUT]');
    expect(out).toContain('[3MATCH]');
    expect(out).toContain('[3TEAMS]');
    expect(out).toContain('[3PLAYERS-H]');
    expect(out).toContain('[3PLAYERS-V]');
    expect(out).toContain('[3SCOUT]');
    expect(out).toContain('HOM;Casa');
    expect(out).toContain('AWY;Ospite');
  });

  it('serializza ogni azione e emette punto quando lo score cambia', () => {
    const actions: ScoutAction[] = [
      {
        id: '1', timestamp: '00:00:05', team: 'home', playerNumber: 1,
        skill: 'S', skillType: 'H', evaluation: '#',
        startZone: 1, endZone: 5, code: '*01SH#~~1~5',
        setNumber: 1, homeScore: 1, awayScore: 0,
        homeSetterPosition: 1, awaySetterPosition: 1,
        homeLineup: [1, 2, 1, 2, 1, 2], awayLineup: [1, 2, 1, 2, 1, 2],
      },
    ];
    const setResults: SetResult[] = [{ homeScore: 25, awayScore: 20, duration: 30 }];
    const out = generateDVW(matchInfo, home, away, lineup, lineup, actions, setResults, 1, 0);
    expect(out).toContain('*01SH#~~1~5');
    // Riga punto: *p01:00
    expect(out).toMatch(/\*p01:00/);
    // Set result presente
    expect(out).toContain('25-20');
  });
});
