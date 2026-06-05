// Tipi per l'editor tattico visivo

export type TacticalRole =
  | 'setter'     // P - Palleggiatrice
  | 'opposite'   // O - Opposta
  | 'oh1'        // B1 - Banda 1
  | 'oh2'        // B2 - Banda 2
  | 'mb1'        // C1 - Centrale 1
  | 'mb2'        // C2 - Centrale 2
  | 'libero'     // L  - Libero
  | 'ball'       // Pallone
  | 'generic';   // X  - Generico

export interface TacticalMarker {
  id: string;
  role: TacticalRole;
  x: number;   // 0–100
  y: number;   // 0–100
  label?: string;
}

export interface TacticalArrow {
  id: string;
  fromX: number; fromY: number;
  toX: number;   toY: number;
  style: 'solid' | 'dashed';
  color: string;
}

export interface TacticalDiagram {
  markers: TacticalMarker[];
  arrows: TacticalArrow[];
}

export const EMPTY_DIAGRAM: TacticalDiagram = { markers: [], arrows: [] };
