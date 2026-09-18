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
});