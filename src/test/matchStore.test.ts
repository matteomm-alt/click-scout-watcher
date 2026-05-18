import { describe, it, expect, beforeEach } from 'vitest';
import { useMatchStore } from '@/store/matchStore';
import type { Player, Lineup } from '@/types/volleyball';

const mkPlayer = (n: number, role: Player['role'], isLib = false): Player => ({
  id: `p${n}`, number: n, lastName: `L${n}`, firstName: 'F', role, isLibero: isLib, isCaptain: false,
});

// Roster standard 6+L: S=1, M=2,3, O=4,5, OP=6, L=7
const roster: Player[] = [
  mkPlayer(1, 'S'), mkPlayer(2, 'M'), mkPlayer(3, 'M'),
  mkPlayer(4, 'O'), mkPlayer(5, 'O'), mkPlayer(6, 'OP'),
  mkPlayer(7, 'L', true),
];

// Lineup di partenza: P1=S(1), P2=O(5), P3=M(2), P4=OP(6), P5=O(4), P6=M(3)
const lineup: Lineup = {
  p1: 'p1', p2: 'p5', p3: 'p2', p4: 'p6', p5: 'p4', p6: 'p3',
  libero1: 'p7', libero2: null, setter: 'p1',
};

function bootstrap() {
  const s = useMatchStore.getState();
  s.resetMatch();
  s.setHomeTeam({ players: roster });
  s.setAwayTeam({ players: roster.map(p => ({ ...p, id: `a${p.number}` })) });
  s.setHomeLineup(lineup);
  s.setAwayLineup({
    ...lineup,
    p1: 'a1', p2: 'a5', p3: 'a2', p4: 'a6', p5: 'a4', p6: 'a3',
    libero1: 'a7', setter: 'a1',
  });
  s.startMatch();
}

describe('matchStore — rotazioni FIVB', () => {
  beforeEach(() => bootstrap());

  it('startMatch imposta setter pos = 1 e applica libero swap', () => {
    const { matchState } = useMatchStore.getState();
    expect(matchState.isMatchStarted).toBe(true);
    expect(matchState.homeSetterPosition).toBe(1);
    // Libero in campo: il centrale di seconda linea (P1/P5/P6) viene panchinato.
    // P6 = M(3) → libero swap → benchedMb deve essere 3 (oppure 2 se idx0 non era M).
    expect(matchState.homeBenchedMb).not.toBeNull();
    expect([2, 3]).toContain(matchState.homeBenchedMb);
  });

  it('rotateTeam shifta lineup e decrementa setter pos (1→6)', () => {
    const before = useMatchStore.getState().matchState;
    const setterBefore = before.homeSetterPosition;
    useMatchStore.getState().rotateTeam('home');
    const after = useMatchStore.getState().matchState;
    const expected = setterBefore === 1 ? 6 : setterBefore - 1;
    expect(after.homeSetterPosition).toBe(expected);
    // P1 nuovo = P2 vecchio
    expect(after.homeCurrentLineup[0]).toBe(before.homeCurrentLineup[1]);
    // P6 nuovo = P1 vecchio
    expect(after.homeCurrentLineup[5]).toBe(before.homeCurrentLineup[0]);
  });

  it('addPoint causa rotazione solo quando cambia chi serve (side-out)', () => {
    const store = useMatchStore.getState();
    // Serve home; punto home → niente rotazione
    const before = store.matchState.homeCurrentLineup.slice();
    store.addPoint('home');
    const afterA = useMatchStore.getState().matchState.homeCurrentLineup;
    expect(afterA).toEqual(before);

    // Punto away → away passa a servire; siccome erano riceventi devono ruotare
    const awayBefore = useMatchStore.getState().matchState.awayCurrentLineup.slice();
    useMatchStore.getState().addPoint('away');
    const afterAway = useMatchStore.getState().matchState.awayCurrentLineup;
    expect(afterAway[5]).toBe(awayBefore[0]);
  });
});

describe('matchStore — snapshot azione (Phase 11)', () => {
  beforeEach(() => bootstrap());

  it('addAction salva snapshot di rotazione, fase K1/K2 e rallyId', () => {
    const s = useMatchStore.getState();
    // Home serve → azione del team away (chi riceve) = K1
    s.addAction({
      timestamp: '00:00:01', team: 'away', playerNumber: 5,
      skill: 'R', skillType: 'H', evaluation: '#', code: 'a05RH#',
    });
    const a = useMatchStore.getState().matchState.actions[0];
    expect(a.phase).toBe('K1');
    expect(a.servingTeam).toBe('home');
    expect(a.rallyId).toBe('1-0-0');
    expect(a.homeLineup).toHaveLength(6);
    expect(a.awayLineup).toHaveLength(6);
    expect(a.homeSetterPosition).toBe(1);

    // Azione della home che serve = K2 (break)
    s.addAction({
      timestamp: '00:00:02', team: 'home', playerNumber: 1,
      skill: 'S', skillType: 'H', evaluation: '+', code: '*01SH+',
    });
    const b = useMatchStore.getState().matchState.actions[1];
    expect(b.phase).toBe('K2');
  });
});
