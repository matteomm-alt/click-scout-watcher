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
  // S1: palleggiatore in P1 (back-right). OPP in P4. OH in P2 (front) e P5 (back).
  1: {
    1: { x: 72, y: 14 }, // S → release a rete dx
    2: { x: 75, y: 58 }, // OH1 (front-right) scende a RB ricezione
    3: { x: 50, y: 10 }, // MB1 a rete
    4: { x: 20, y: 20 }, // OPP nascosto front-left
    5: { x: 22, y: 58 }, // OH2 LB ricezione
    6: { x: 50, y: 75 }, // L CB ricezione
  },
  // S2: palleggiatore in P2 (front-right). OPP in P5. 3 ricevitori = P1, P5(OPP no→OH) ... usiamo P1, P5, P6.
  // In rotazione P2 setter, gli OH sono in P3 e P6 typically; per semplicità: ricevitori P1+P6+P5.
  2: {
    1: { x: 75, y: 58 }, // RB
    2: { x: 72, y: 14 }, // S → release
    3: { x: 50, y: 10 }, // MB a rete
    4: { x: 20, y: 20 }, // hide front-left
    5: { x: 22, y: 58 }, // LB
    6: { x: 50, y: 75 }, // CB (L)
  },
  // S3: palleggiatore in P3 (front-middle).
  3: {
    1: { x: 75, y: 58 }, // RB
    2: { x: 80, y: 18 }, // a rete dx
    3: { x: 65, y: 14 }, // S → release leggermente a dx
    4: { x: 20, y: 20 }, // hide
    5: { x: 22, y: 58 }, // LB
    6: { x: 50, y: 75 }, // CB (L)
  },
  // S4: palleggiatore in P4 (front-left). Si sposta a destra per alzare.
  4: {
    1: { x: 75, y: 58 }, // RB
    2: { x: 80, y: 18 }, // a rete dx
    3: { x: 50, y: 10 }, // MB a rete
    4: { x: 65, y: 14 }, // S parte da sx ma scende a dx (release)
    5: { x: 22, y: 58 }, // LB
    6: { x: 50, y: 75 }, // CB (L)
  },
  // S5: palleggiatore in P5 (back-left). OH in P2 scende a LB.
  5: {
    1: { x: 75, y: 58 }, // RB
    2: { x: 22, y: 58 }, // OH1 scende a LB
    3: { x: 50, y: 10 }, // MB a rete
    4: { x: 20, y: 20 }, // OPP hide
    5: { x: 65, y: 14 }, // S → release
    6: { x: 50, y: 75 }, // CB (L)
  },
  // S6: palleggiatore in P6 (back-middle). 3 ricevitori = P1 RB, P5 LB, OH che scende.
  6: {
    1: { x: 75, y: 58 }, // RB
    2: { x: 50, y: 68 }, // OH scende centro-back come 3° ricevitore
    3: { x: 50, y: 10 }, // MB a rete
    4: { x: 20, y: 20 }, // OPP hide
    5: { x: 22, y: 58 }, // LB
    6: { x: 65, y: 14 }, // S → release
  },
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
