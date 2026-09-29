import { describe, expect, it } from 'vitest';
import {
  POS_AWAY,
  POS_HOME,
  ZONE_CENTERS_AWAY,
  ZONE_CENTERS_HOME,
  nearestZone,
} from '@/lib/courtPositionResolver';

describe('orientamento del campo', () => {
  it('colloca P1 in basso a sinistra sul campo sinistro', () => {
    expect(POS_AWAY[1]).toEqual({ x: 28, y: 78 });
    expect(POS_AWAY[5]).toEqual({ x: 28, y: 22 });
  });

  it('colloca P1 in alto a destra sul campo destro', () => {
    expect(POS_HOME[1]).toEqual({ x: 72, y: 22 });
    expect(POS_HOME[5]).toEqual({ x: 72, y: 78 });
  });

  it('mantiene coerenti marker, zone e selezione del punto', () => {
    const awayZone1 = ZONE_CENTERS_AWAY.find(({ zone }) => zone === 1);
    const homeZone1 = ZONE_CENTERS_HOME.find(({ zone }) => zone === 1);
    expect(awayZone1).toMatchObject(POS_AWAY[1]);
    expect(homeZone1).toMatchObject(POS_HOME[1]);
    expect(nearestZone('away', POS_AWAY[1])).toBe(1);
    expect(nearestZone('home', POS_HOME[1])).toBe(1);
  });

  it('allinea la linea di fondo (7-8-9) dietro le zone 5-6-1 su entrambe le metà', () => {
    const halves = { away: ZONE_CENTERS_AWAY, home: ZONE_CENTERS_HOME };
    for (const [team, centers] of Object.entries(halves)) {
      const at = (zone: number) => centers.find((c) => c.zone === zone);
      expect(at(7)?.y, `${team}: zona 7`).toBe(at(5)?.y);
      expect(at(8)?.y, `${team}: zona 8`).toBe(at(6)?.y);
      expect(at(9)?.y, `${team}: zona 9`).toBe(at(1)?.y);
      // "dietro" = più lontano dalla rete (rete al centro, x = 50)
      const depth = (x: number) => (team === 'away' ? 50 - x : x - 50);
      expect(depth(at(7)!.x) > depth(at(5)!.x), `${team}: zona 7 dietro la 5`).toBe(true);
      expect(depth(at(8)!.x) > depth(at(6)!.x), `${team}: zona 8 dietro la 6`).toBe(true);
      expect(depth(at(9)!.x) > depth(at(1)!.x), `${team}: zona 9 dietro la 1`).toBe(true);
    }
  });
});