import { describe, it, expect } from 'vitest';
import { toCourtPoint } from '@/lib/courtCoords';

describe('toCourtPoint', () => {
  it('la rete è a y=0.5 per entrambe le squadre', () => {
    expect(toCourtPoint('away', { x: 100, y: 50 }).y).toBe(0.5);
    expect(toCourtPoint('home', { x: 0, y: 50 }).y).toBe(0.5);
  });
  it('il fondo campo Ospite è y=0 e quello Casa è y=1', () => {
    expect(toCourtPoint('away', { x: 0, y: 0 }).y).toBe(0);
    expect(toCourtPoint('home', { x: 100, y: 0 }).y).toBe(1);
  });
  it('la larghezza segue y della metà campo e resta tra 0 e 1', () => {
    expect(toCourtPoint('home', { x: 50, y: 25 }).x).toBe(0.25);
    expect(toCourtPoint('away', { x: 50, y: 140 }).x).toBe(1);
    expect(toCourtPoint('away', { x: 50, y: -5 }).x).toBe(0);
  });
});
