import { useMatchStore } from '@/store/matchStore';

interface ZoneCourtProps {
  onZoneClick?: (zone: number) => void;
  highlightedZone?: number | null;
  startZone?: number | null;
  endZone?: number | null;
  mode?: 'display' | 'select-start' | 'select-end';
  side?: 'home' | 'away';
}

// DVW / Click&Scout numbering — same order as scout codes:
// Front (near net): 4-3-2 | Back: 5-6-1 | Behind end line: 7-8-9
type Zone = { zone: number; col: number; row: number; label: string };
const ZONES: Zone[] = [
  { zone: 4, col: 0, row: 0, label: 'Front Left' },
  { zone: 3, col: 1, row: 0, label: 'Front Middle' },
  { zone: 2, col: 2, row: 0, label: 'Front Right' },
  { zone: 5, col: 0, row: 1, label: 'Back Left' },
  { zone: 6, col: 1, row: 1, label: 'Back Middle' },
  { zone: 1, col: 2, row: 1, label: 'Back Right' },
  { zone: 7, col: 0, row: 2, label: 'Service 7' },
  { zone: 8, col: 1, row: 2, label: 'Service 8' },
  { zone: 9, col: 2, row: 2, label: 'Service 9' },
];

export function ZoneCourt({ onZoneClick, highlightedZone, startZone, endZone, mode = 'display' }: ZoneCourtProps) {
  const isSelectable = mode === 'select-start' || mode === 'select-end';

  const cellState = (z: number) => {
    if (startZone === z) return 'start';
    if (endZone === z) return 'end';
    if (highlightedZone === z) return 'hl';
    return 'idle';
  };

  // Compute arrow positions in % coordinates inside the court grid (3 cols x 3 rows)
  const zonePos = (zone: number) => {
    const z = ZONES.find((zz) => zz.zone === zone);
    if (!z) return null;
    return {
      x: (z.col + 0.5) * (100 / 3),
      y: (z.row + 0.5) * (100 / 3),
    };
  };
  const startPos = startZone ? zonePos(startZone) : null;
  const endPos = endZone ? zonePos(endZone) : null;
  const showArrow = startPos && endPos && startZone !== endZone;

  return (
    <div className="w-full">
      {/* Net header */}
      <div className="relative h-8 flex items-center justify-center mb-1 overflow-hidden rounded-t-lg bg-zinc-900/80 border-x border-t border-border">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--foreground) / 0.15) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />
        <div className="absolute top-0 w-full h-1 bg-foreground/20" />
        <span className="relative z-10 text-[10px] font-bold tracking-[0.5em] text-muted-foreground uppercase">
          RETE
        </span>
      </div>

      {/* Court — taraflex with gradient, wide horizontal like Click & Scout */}
      <div
        className="relative grid grid-rows-3 gap-0 border border-foreground/20 shadow-2xl overflow-hidden rounded-b-lg w-full aspect-[16/7]"
        style={{
          background: 'linear-gradient(180deg, hsl(215 70% 32%) 0%, hsl(215 70% 22%) 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Build by rows so we can apply the bold 3m line and end line */}
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className={`grid grid-cols-3 relative ${
              row === 0 ? 'border-b-4 border-white/80' : row === 1 ? 'border-b-[6px] border-white' : ''
            } ${row === 2 ? 'bg-black/30' : ''}`}
          >
            {ZONES.filter((z) => z.row === row).map((z, idx) => {
              const state = cellState(z.zone);
              const fill =
                state === 'start'
                  ? 'bg-primary/30'
                  : state === 'end'
                  ? 'bg-accent/30'
                  : state === 'hl'
                  ? 'bg-white/5'
                  : '';
              const ring =
                state === 'start'
                  ? 'ring-2 ring-primary/80 ring-inset'
                  : state === 'end'
                  ? 'ring-2 ring-accent/80 ring-inset'
                  : '';
              const numberColor =
                state === 'start' || state === 'end'
                  ? 'text-white'
                  : row === 2
                  ? 'text-white/10'
                  : 'text-white/15';

              return (
                <button
                  type="button"
                  key={z.zone}
                  onClick={() => isSelectable && onZoneClick?.(z.zone)}
                  disabled={!isSelectable}
                  className={`relative flex items-center justify-center transition-colors overflow-hidden ${
                    idx < 2 ? (row === 2 ? 'border-r-2 border-white/10' : 'border-r-2 border-white/40') : ''
                  } ${fill} ${ring} ${
                    isSelectable ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'
                  }`}
                >
                  {/* 3x3 dashed subzone grid (visual only, DVW reference) */}
                  <svg
                    className="pointer-events-none absolute inset-0 w-full h-full"
                    viewBox="0 0 90 90"
                    preserveAspectRatio="none"
                  >
                    {/* vertical lines at 1/3 and 2/3 */}
                    <line x1="30" y1="0" x2="30" y2="90" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                    <line x1="60" y1="0" x2="60" y2="90" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                    {/* horizontal lines at 1/3 and 2/3 */}
                    <line x1="0" y1="30" x2="90" y2="30" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1="60" x2="90" y2="60" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <span
                    className={`relative text-5xl md:text-6xl lg:text-7xl font-black italic ${numberColor} transition-colors leading-none`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {z.zone}
                  </span>
                  <span
                    className={`absolute top-1.5 left-2 text-[9px] font-bold uppercase tracking-widest ${
                      row === 2 ? 'text-white/20' : 'text-white/40'
                    }`}
                  >
                    {z.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {/* Animated trajectory arrow overlay */}
        {showArrow && (
          <svg
            key={`${startZone}-${endZone}`}
            className="pointer-events-none absolute inset-0 w-full h-full z-20"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="4"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--accent))" />
              </marker>
            </defs>
            {/* Glow line */}
            <line
              x1={startPos!.x}
              y1={startPos!.y}
              x2={endPos!.x}
              y2={endPos!.y}
              stroke="hsl(var(--accent) / 0.35)"
              strokeWidth="1.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: 'blur(2px)' }}
            />
            {/* Main animated dashed line */}
            <line
              x1={startPos!.x}
              y1={startPos!.y}
              x2={endPos!.x}
              y2={endPos!.y}
              stroke="hsl(var(--accent))"
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#arrowhead)"
              style={{ animation: 'court-dash 0.8s linear infinite' }}
            />
            {/* Start dot */}
            <circle
              cx={startPos!.x}
              cy={startPos!.y}
              r="1.6"
              fill="hsl(var(--primary))"
              stroke="white"
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            >
              <animate attributeName="r" values="1.6;2.4;1.6" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>
        )}
      </div>

      {/* Trajectory hint */}
      {startZone && endZone && (
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-primary/20 text-primary font-mono font-bold">
            {startZone}
          </span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-accent/20 text-accent font-mono font-bold">
            {endZone}
          </span>
        </div>
      )}
    </div>
  );
}

// Full court — proporzioni reali (24m × 9m totali: 3m servizio + 9m + 9m + 3m servizio)
// Ogni metà = 9m × 9m divisa in 9 zone DVW (3×3) + striscia servizio 3m × 9m dietro fondo
export function VolleyballCourt() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find((p) => p.number === num);
    return player
      ? { number: num, name: player.lastName, role: player.role }
      : { number: num, name: `#${num}`, role: undefined };
  };

  // Vista landscape: net verticale al centro.
  // Per ogni metà: 3 colonne (front→back, allontanandosi dalla rete) × 3 righe (alto→basso, da sinistra a destra del campo visto dal sideline).
  // HOME (a destra, net a sinistra):
  //   col0 = front: zona 4 (top), 3 (mid), 2 (bottom)
  //   col1 = back:  zona 5 (top), 6 (mid), 1 (bottom)
  //   col2 = (zona giocata posteriore — usata per movimenti, niente P)
  // Le posizioni P1-P6 ricalcano: P4=z4, P3=z3, P2=z2, P5=z5, P6=z6, P1=z1.
  // Le zone 7-8-9 stanno sulla STRISCIA SERVIZIO dietro la linea di fondo.

  type Cell = { z: number; pos: number | null; sub?: 'front' | 'back' | 'service' };

  // HOME: 3 fasce verticali da sinistra (vicino rete) a destra (fondo + servizio)
  // Fascia front (3m vicino rete) – zone 4,3,2
  // Fascia back (3m successivi) – zone 5,6,1
  // Linea di fondo, poi striscia servizio (3m) – zone 7,8,9
  const HOME_FRONT: Cell[] = [
    { z: 4, pos: 4 }, { z: 3, pos: 3 }, { z: 2, pos: 2 },
  ];
  const HOME_BACK: Cell[] = [
    { z: 5, pos: 5 }, { z: 6, pos: 6 }, { z: 1, pos: 1 },
  ];
  const HOME_SERVICE: Cell[] = [
    { z: 7, pos: null }, { z: 8, pos: null }, { z: 9, pos: null },
  ];

  // AWAY: specchiato → fronte vicino rete (a destra del lato away), poi back, poi servizio a sinistra
  const AWAY_FRONT: Cell[] = [
    { z: 2, pos: 2 }, { z: 3, pos: 3 }, { z: 4, pos: 4 },
  ];
  const AWAY_BACK: Cell[] = [
    { z: 1, pos: 1 }, { z: 6, pos: 6 }, { z: 5, pos: 5 },
  ];
  const AWAY_SERVICE: Cell[] = [
    { z: 9, pos: null }, { z: 8, pos: null }, { z: 7, pos: null },
  ];

  // Colori taraflex VNL: front orange/red (intensità), back blu, servizio blu scuro
  const FRONT_BG = 'linear-gradient(180deg, hsl(15 80% 45%) 0%, hsl(12 85% 38%) 100%)';
  const BACK_BG = 'linear-gradient(180deg, hsl(212 75% 32%) 0%, hsl(212 75% 24%) 100%)';
  const SERVICE_BG = 'linear-gradient(180deg, hsl(215 60% 16%) 0%, hsl(218 65% 11%) 100%)';

  const renderBand = (
    cells: Cell[],
    bg: string,
    teamColor: 'home' | 'away',
    lineup: number[],
    setterPosition: number,
    isService: boolean,
  ) => (
    <div
      className="relative grid grid-rows-3 h-full"
      style={{ background: bg }}
    >
      {cells.map((cell) => {
        const playerNum = cell.pos !== null ? lineup[cell.pos - 1] : null;
        const info = playerNum ? getPlayerInfo(playerNum, teamColor) : null;
        const isSetter = cell.pos !== null && cell.pos === setterPosition;
        const isLibero = info?.role === 'L';

        return (
          <div
            key={cell.z}
            className="relative flex items-center justify-center border border-white/25"
          >
            {/* Numero zona DVW di sfondo */}
            <span
              className="absolute text-3xl md:text-4xl lg:text-5xl font-black italic leading-none select-none pointer-events-none"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: isService ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.14)',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {cell.z}
            </span>

            {/* Posizione P1-P6 */}
            {cell.pos !== null && (
              <span
                className={`absolute top-1 left-1 text-[8px] md:text-[9px] font-bold tracking-wider z-10 ${
                  isSetter ? 'text-warning' : 'text-white/55'
                }`}
              >
                P{cell.pos}
              </span>
            )}

            {/* Giocatore */}
            {info && (
              <div className="relative z-20 flex flex-col items-center">
                <div className="relative">
                  <div
                    className={`size-9 md:size-10 lg:size-11 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg ${
                      isSetter ? 'ring-2 ring-warning ring-offset-1 ring-offset-transparent' : ''
                    } ${
                      isLibero
                        ? 'bg-yellow-700 border-2 border-yellow-400'
                        : teamColor === 'home'
                        ? 'bg-blue-700 border-2 border-blue-300'
                        : 'bg-red-700 border-2 border-red-300'
                    }`}
                  >
                    {info.number}
                  </div>
                  {isSetter && (
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-warning text-background text-[8px] font-black px-1 rounded shadow"
                      title="Setter"
                    >
                      S
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-white/85 mt-0.5 font-medium drop-shadow">
                  {info.name.slice(0, 7)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full">
      {/* Net header */}
      <div className="relative h-8 flex items-center justify-center mb-1 overflow-hidden rounded-t-lg bg-zinc-900/80 border-x border-t border-border">
        <div className="absolute top-0 w-full h-0.5 bg-foreground/20" />
        <span className="relative z-10 text-[10px] font-bold tracking-[0.5em] text-muted-foreground uppercase">
          RETE
        </span>
      </div>

      {/* Campo intero — proporzione reale 24:9
          Layout colonne: [3 servizio away][3 back away][3 front away][NET][3 front home][3 back home][3 servizio home] */}
      <div
        className="grid border border-foreground/20 shadow-2xl rounded-b-lg overflow-hidden relative"
        style={{
          aspectRatio: '24 / 9',
          gridTemplateColumns: '3fr 3fr 3fr 0fr 3fr 3fr 3fr',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Etichette squadre */}
        <div className="absolute top-2 left-3 z-30 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black/50 backdrop-blur text-red-200">
          {awayTeam.name || 'OSPITE'}
        </div>
        <div className="absolute top-2 right-3 z-30 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black/50 backdrop-blur text-blue-200">
          {homeTeam.name || 'CASA'}
        </div>
        <div className="absolute bottom-1 left-2 z-20 text-[8px] font-bold uppercase tracking-widest text-white/40">
          ◀ Servizio
        </div>
        <div className="absolute bottom-1 right-2 z-20 text-[8px] font-bold uppercase tracking-widest text-white/40">
          Servizio ▶
        </div>

        {/* AWAY: servizio | back | front */}
        {renderBand(AWAY_SERVICE, SERVICE_BG, 'away', matchState.awayCurrentLineup, matchState.awaySetterPosition, true)}
        {renderBand(AWAY_BACK, BACK_BG, 'away', matchState.awayCurrentLineup, matchState.awaySetterPosition, false)}
        {renderBand(AWAY_FRONT, FRONT_BG, 'away', matchState.awayCurrentLineup, matchState.awaySetterPosition, false)}

        {/* NET line (1px ma con shadow) */}
        <div className="relative">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] z-10" />
        </div>

        {/* HOME: front | back | servizio */}
        {renderBand(HOME_FRONT, FRONT_BG, 'home', matchState.homeCurrentLineup, matchState.homeSetterPosition, false)}
        {renderBand(HOME_BACK, BACK_BG, 'home', matchState.homeCurrentLineup, matchState.homeSetterPosition, false)}
        {renderBand(HOME_SERVICE, SERVICE_BG, 'home', matchState.homeCurrentLineup, matchState.homeSetterPosition, true)}

        {/* Linee di fondo (separano back da servizio) */}
        <div className="absolute inset-y-0 left-[25%] w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)] pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-[25%] w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)] pointer-events-none z-10" />
      </div>
    </div>
  );
}
