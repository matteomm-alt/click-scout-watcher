/**
 * Rotazioni predefinite di squadra.
 *
 * Una formazione di squadra è descritta da una rotazione base (chi sta in
 * P1..P6 all'inizio, più palleggiatore e libero, tutti per numero di maglia).
 * Le 6 rotazioni R1..R6 sono derivate ruotando in senso orario:
 * P2→P1, P1→P6, P6→P5, P5→P4, P4→P3, P3→P2.
 */

export type PosKey = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';

export const POS_KEYS: PosKey[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

export interface RotationBase {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  p5: number | null;
  p6: number | null;
  setter: number | null;
  libero: number | null;
}

export const EMPTY_ROTATION_BASE: RotationBase = {
  p1: null, p2: null, p3: null, p4: null, p5: null, p6: null,
  setter: null, libero: null,
};

export function isRotationBase(value: unknown): value is RotationBase {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return POS_KEYS.every((k) => k in v);
}

export function parseRotationBase(value: unknown): RotationBase | null {
  if (!isRotationBase(value)) return null;
  const v = value as unknown as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === 'number' ? x : null);
  return {
    p1: num(v.p1), p2: num(v.p2), p3: num(v.p3),
    p4: num(v.p4), p5: num(v.p5), p6: num(v.p6),
    setter: num(v.setter), libero: num(v.libero),
  };
}

export function isRotationComplete(base: RotationBase): boolean {
  return POS_KEYS.every((k) => typeof base[k] === 'number') && typeof base.setter === 'number';
}

/** Ruota la base di `steps` cambi palla (senso orario). */
export function rotateBase(base: RotationBase, steps: number): Record<PosKey, number | null> {
  const order: PosKey[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const s = ((steps % 6) + 6) % 6;
  const out = {} as Record<PosKey, number | null>;
  order.forEach((key, idx) => {
    // dopo una rotazione, in P(idx+1) arriva chi era in P(idx+2)
    const sourceIdx = (idx + s) % 6;
    out[key] = base[order[sourceIdx]];
  });
  return out;
}

/** Posizione (1..6) del palleggiatore nella rotazione indicata. */
export function setterPositionAt(base: RotationBase, steps: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const rot = rotateBase(base, steps);
  const idx = POS_KEYS.findIndex((k) => rot[k] != null && rot[k] === base.setter);
  return ((idx >= 0 ? idx + 1 : 1) as 1 | 2 | 3 | 4 | 5 | 6);
}

/** Le 6 rotazioni derivate, ordinate per posizione del palleggiatore crescente. */
export function derivedRotations(base: RotationBase) {
  return [0, 1, 2, 3, 4, 5]
    .map((steps) => ({
      steps,
      setterPosition: setterPositionAt(base, steps),
      positions: rotateBase(base, steps),
    }))
    .sort((a, b) => a.setterPosition - b.setterPosition);
}
