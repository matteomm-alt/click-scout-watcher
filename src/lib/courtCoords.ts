/**
 * Coordinate reali del campo (formato Data Volley, 0..1).
 *  - x = larghezza del campo (0 = lato alto dello schermo non ribaltato, 1 = lato basso);
 *  - y = lunghezza del campo: 0 = fondo campo OSPITE, 0.5 = rete, 1 = fondo campo CASA.
 * Il punto cliccato arriva già nel riferimento "della squadra" (stesso di nearestZone):
 * 0..100 su ciascun lato, con la rete a x=100 per l'Ospite e a x=0 per la Casa.
 * Così le coordinate sono confrontabili tra set e dopo i cambi campo.
 */
export interface HalfPoint { x: number; y: number }
export interface CourtPoint { x: number; y: number }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function toCourtPoint(team: 'home' | 'away', p: HalfPoint): CourtPoint {
  const len = team === 'away' ? p.x / 200 : 0.5 + p.x / 200;
  return { x: round3(clamp01(p.y / 100)), y: round3(clamp01(len)) };
}
