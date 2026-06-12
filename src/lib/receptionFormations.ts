/**
 * Posizioni di ricezione standard per il modulo 5-1.
 *
 * Sistema internazionale a 3 ricevitori:
 *  - Palleggiatore (S) sale a rete a destra per alzare
 *  - Centrale frontale (MB) rimane a rete al centro
 *  - Opposto (OPP) si nasconde a rete a sinistra
 *  - 2 Schiacciatori (OH1, OH2) + Libero (L) compongono i 3 ricevitori in W
 *
 * Coordinate (x, y) in percentuale della metà campo, vista dalla
 * prospettiva di una squadra con la RETE in alto (y=0) e linea di
 * fondo in basso (y=100). Per la squadra "home" (rete in basso) il
 * componente VolleyballCourt specchia automaticamente y → 100 - y.
 *
 * I defaults sono pensati come punto di partenza consigliato; ogni
 * coach può personalizzarli tramite l'editor "Schemi ricezione".
 */

export type Coord = { x: number; y: number };

// Slot 1..6 = posizione di rotazione P1..P6
export type SlotPositions = Record<1 | 2 | 3 | 4 | 5 | 6, Coord>;

// Setter position 1..6 → posizioni dei 6 slot durante la ricezione
export type ReceptionFormations = Record<1 | 2 | 3 | 4 | 5 | 6, SlotPositions>;

/**
 * Default 5-1 internazionale (3 ricevitori) per ogni rotazione del palleggiatore.
 *
 * Convenzione 5-1 standard:
 *  - Opposto (OPP) sta nello slot diametralmente opposto al palleggiatore
 *  - I due centrali (MB) sono in P3/P6 oppure P2/P5 a seconda della rotazione
 *  - I due schiacciatori (OH) negli slot rimanenti
 *  - Libero in campo al posto del centrale di seconda linea
 */
export const DEFAULT_RECEPTION_FORMATIONS: ReceptionFormations = {
  // Posizioni FIVB standard P1-P6 — fisse per tutte le rotazioni
  // P1=fondo dx, P2=rete dx, P3=rete cx, P4=rete sx, P5=fondo sx, P6=fondo cx
  1: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
  2: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
  3: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
  4: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
  5: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
  6: { 1:{x:78,y:78}, 2:{x:78,y:18}, 3:{x:50,y:18}, 4:{x:22,y:18}, 5:{x:22,y:78}, 6:{x:50,y:78} },
};

export function cloneDefaultFormations(): ReceptionFormations {
  return JSON.parse(JSON.stringify(DEFAULT_RECEPTION_FORMATIONS));
}

/**
 * Restituisce le posizioni dei 6 slot per il team indicato durante la ricezione,
 * date le formazioni personalizzate e la posizione attuale del palleggiatore.
 * Se per una squadra "home" (rete in basso) viene chiesta la conversione,
 * `mirror=true` specchia y → 100-y.
 */
export function getReceptionPositions(
  formations: ReceptionFormations,
  setterPosition: number,
  mirror: boolean
): SlotPositions {
  const sp = (Math.min(6, Math.max(1, setterPosition)) as 1 | 2 | 3 | 4 | 5 | 6);
  const base = formations[sp] ?? DEFAULT_RECEPTION_FORMATIONS[sp];
  if (!mirror) return base;
  const out = {} as SlotPositions;
  (Object.keys(base) as unknown as (keyof SlotPositions)[]).forEach((k) => {
    out[k] = { x: base[k].x, y: 100 - base[k].y };
  });
  return out;
}

/**
 * Posizioni di attacco standard 5-1 per ogni rotazione del palleggiatore.
 * Rappresentano dove si trovano fisicamente le giocatrici durante l'alzata.
 */
export const DEFAULT_ATTACK_FORMATIONS: ReceptionFormations = {
  1: {
    1: { x: 78, y: 12 },
    2: { x: 50, y: 40 },
    3: { x: 50, y: 8 },
    4: { x: 16, y: 12 },
    5: { x: 16, y: 20 },
    6: { x: 50, y: 72 },
  },
  2: {
    1: { x: 50, y: 40 },
    2: { x: 78, y: 12 },
    3: { x: 50, y: 8 },
    4: { x: 16, y: 12 },
    5: { x: 20, y: 14 },
    6: { x: 50, y: 72 },
  },
  3: {
    1: { x: 50, y: 40 },
    2: { x: 78, y: 14 },
    3: { x: 65, y: 10 },
    4: { x: 16, y: 12 },
    5: { x: 18, y: 22 },
    6: { x: 50, y: 72 },
  },
  4: {
    1: { x: 50, y: 40 },
    2: { x: 78, y: 14 },
    3: { x: 50, y: 8 },
    4: { x: 68, y: 10 },
    5: { x: 18, y: 22 },
    6: { x: 50, y: 72 },
  },
  5: {
    1: { x: 50, y: 40 },
    2: { x: 16, y: 14 },
    3: { x: 50, y: 8 },
    4: { x: 16, y: 18 },
    5: { x: 68, y: 10 },
    6: { x: 50, y: 72 },
  },
  6: {
    1: { x: 78, y: 40 },
    2: { x: 50, y: 8 },
    3: { x: 50, y: 10 },
    4: { x: 16, y: 14 },
    5: { x: 18, y: 22 },
    6: { x: 68, y: 10 },
  },
};

export function getAttackPositions(
  formations: ReceptionFormations,
  setterPosition: number,
  mirror: boolean,
): SlotPositions {
  const sp = (Math.min(6, Math.max(1, setterPosition)) as 1 | 2 | 3 | 4 | 5 | 6);
  const base = formations[sp] ?? DEFAULT_ATTACK_FORMATIONS[sp];
  if (!mirror) return base;
  const out = {} as SlotPositions;
  (Object.keys(base) as unknown as (keyof SlotPositions)[]).forEach((k) => {
    out[k] = { x: base[k].x, y: 100 - base[k].y };
  });
  return out;
}

/** Clone delle formazioni di attacco default (per inizializzazione store) */
export function cloneDefaultAttackFormations(): ReceptionFormations {
  return JSON.parse(JSON.stringify(DEFAULT_ATTACK_FORMATIONS));
}

export const DEFAULT_DEFENSE_FORMATIONS: ReceptionFormations = {
  1: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
  2: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
  3: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
  4: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
  5: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
  6: { 1:{x:50,y:50}, 2:{x:50,y:50}, 3:{x:50,y:50}, 4:{x:50,y:50}, 5:{x:50,y:50}, 6:{x:50,y:50} },
};

export function cloneDefaultDefenseFormations(): ReceptionFormations {
  return JSON.parse(JSON.stringify(DEFAULT_DEFENSE_FORMATIONS));
}

export function getDefensePositions(
  formations: ReceptionFormations,
  setterPosition: number,
  mirror: boolean,
): SlotPositions | null {
  const sp = (Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6);
  const base = formations[sp] ?? DEFAULT_DEFENSE_FORMATIONS[sp];
  const isUnconfigured = Object.values(base).every(p => p.x === 50 && p.y === 50);
  if (isUnconfigured) return null;
  if (!mirror) return base;
  const out = {} as SlotPositions;
  (Object.keys(base) as unknown as (keyof SlotPositions)[]).forEach(k => {
    out[k] = { x: base[k].x, y: 100 - base[k].y };
  });
  return out;
}

export function isDefenseConfigured(
  formations: ReceptionFormations,
  setterPosition: number,
): boolean {
  const sp = (Math.min(6, Math.max(1, setterPosition)) as 1|2|3|4|5|6);
  const base = formations[sp] ?? DEFAULT_DEFENSE_FORMATIONS[sp];
  return Object.values(base).some(p => p.x !== 50 || p.y !== 50);
}
