/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { generateDVW } from '@/lib/dvwExporter';
import { parseDvw } from '@/lib/dvwImporter';
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

describe('dvwExporter — nuovi test (P62)', () => {
  const makePlayer = (id: string, number: number, role = 'O', isLibero = false): any => ({
    id, number, firstName: 'Test', lastName: `P${number}`,
    role, isLibero, isCaptain: false,
  });
  const makeTeam = (name: string, players: any[]): any => ({
    id: `team-${name}`, code: name.slice(0, 3).toUpperCase(), name,
    coach: 'Coach', assistantCoach: '', color: '#fff', players,
  });
  const baseLineup: any = { p1: 'p1', p2: 'p2', p3: 'p3', p4: 'p4', p5: 'p5', p6: 'p6', libero1: null, libero2: null, setter: 'p1' };
  const baseAction: any = {
    id: 'a1', timestamp: '12:00:00', team: 'home',
    playerNumber: 1, skill: 'S', skillType: 'H', evaluation: '#',
    setNumber: 1, homeScore: 1, awayScore: 0,
    homeSetterPosition: 1, awaySetterPosition: 1,
    homeLineup: [1, 2, 3, 4, 5, 6], awayLineup: [3, 4, 5, 6, 7, 8],
    code: '*01SH#~~',
  };

  it('round-trip: azioni esportate e reimportate corrispondono', () => {
    const homeTeam = makeTeam('Casa', [makePlayer('p1', 1, 'S')]);
    const awayTeam = makeTeam('Ospite', [makePlayer('p3', 3, 'O')]);
    const mi: any = {
      date: '2026-05-21', time: '20:00', season: '2025/26',
      league: 'A1', phase: 'Regular', venue: 'PalaTest', city: 'Roma',
      scorer: 'Scout', referee1: '', referee2: '', totalSets: 3,
    };
    const dvwStr = generateDVW(mi, homeTeam, awayTeam, baseLineup, baseLineup,
      [baseAction], [{ homeScore: 25, awayScore: 20, duration: 25 }], 1, 0);
    const parsed = parseDvw(dvwStr);
    expect(parsed.actions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.actions[0].skill).toBe('S');
    expect(parsed.actions[0].evaluation).toBe('#');
    expect(parsed.teams.home.name).toBe('Casa');
  });

  it('export contiene sostituzione quando il lineup cambia tra azioni', () => {
    const homeTeam = makeTeam('Casa', [makePlayer('p1', 1, 'S'), makePlayer('p7', 7, 'O')]);
    const awayTeam = makeTeam('Ospite', [makePlayer('p3', 3, 'O')]);
    const mi: any = {
      date: '2026-05-21', time: '20:00', season: '2025/26',
      league: 'A1', phase: 'Regular', venue: '', city: '', scorer: '', referee1: '', referee2: '', totalSets: 3,
    };
    const action1 = { ...baseAction, homeLineup: [1, 2, 3, 4, 5, 6] };
    const action2 = { ...baseAction, id: 'a2', homeScore: 2, code: '*01SH+~~', homeLineup: [1, 2, 3, 4, 7, 6] };
    const dvwStr = generateDVW(mi, homeTeam, awayTeam, baseLineup, baseLineup, [action1, action2], [], 0, 0);
    expect(dvwStr).toContain('*c07:05');
  });

  it('file DVW prodotto ha header FILEFORMAT: 2.0', () => {
    const homeTeam = makeTeam('Casa', []);
    const awayTeam = makeTeam('Ospite', []);
    const mi: any = {
      date: '2026-05-21', time: '20:00', season: '', league: '',
      phase: '', venue: '', city: '', scorer: '', referee1: '', referee2: '', totalSets: 3,
    };
    const dvwStr = generateDVW(mi, homeTeam, awayTeam, baseLineup, baseLineup, [], [], 0, 0);
    expect(dvwStr).toContain('FILEFORMAT: 2.0');
    expect(dvwStr).toContain('[3DATAVOLLEYSCOUT]');
    expect(dvwStr).toContain('[3SCOUT]');
  });
});
});
