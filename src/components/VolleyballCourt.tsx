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
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
                      backgroundSize: 'calc(100%/3) calc(100%/3)',
                      backgroundPosition: '0 0',
                    }}
                  />
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

// Full court (both halves) for the main scoreboard view — landscape
export function VolleyballCourt() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find((p) => p.number === num);
    return player
      ? { number: num, name: player.lastName, role: player.role }
      : { number: num, name: `#${num}`, role: undefined };
  };

  // Each half = 3x2 zone grid (front + back rows). Numbers mirror DVW per side.
  // `pos` is the rotation position (P1-P6) corresponding to that physical zone.
  const HOME_ZONES = [
    { z: 4, col: 0, row: 0, pos: 4 }, { z: 3, col: 1, row: 0, pos: 3 }, { z: 2, col: 2, row: 0, pos: 2 },
    { z: 5, col: 0, row: 1, pos: 5 }, { z: 6, col: 1, row: 1, pos: 6 }, { z: 1, col: 2, row: 1, pos: 1 },
  ];
  // Away half is mirrored (viewed from opposite side)
  const AWAY_ZONES = [
    { z: 2, col: 0, row: 0, pos: 2 }, { z: 3, col: 1, row: 0, pos: 3 }, { z: 4, col: 2, row: 0, pos: 4 },
    { z: 1, col: 0, row: 1, pos: 1 }, { z: 6, col: 1, row: 1, pos: 6 }, { z: 5, col: 2, row: 1, pos: 5 },
  ];

  const Half = ({
    zones,
    teamLabel,
    teamColor,
    lineup,
    setterPosition,
    side,
  }: {
    zones: { z: number; col: number; row: number; pos: number }[];
    teamLabel: string;
    teamColor: 'home' | 'away';
    lineup: number[];
    setterPosition: number;
    side: 'left' | 'right';
  }) => (
    <div className="flex-1 relative grid grid-rows-2">
      {/* Team label */}
      <div
        className={`absolute top-2 ${side === 'left' ? 'left-3' : 'right-3'} z-10 text-[10px] font-bold uppercase tracking-widest ${
          teamColor === 'home' ? 'text-blue-300/80' : 'text-red-300/80'
        }`}
      >
        {teamLabel}
      </div>

      {[0, 1].map((row) => (
        <div
          key={row}
          className={`grid grid-cols-3 relative ${row === 0 ? 'border-b-2 border-dashed border-white/40' : ''}`}
        >
          {zones
            .filter((z) => z.row === row)
            .map((z, idx) => {
              const playerNum = lineup[z.pos - 1];
              const info = playerNum ? getPlayerInfo(playerNum, teamColor) : null;
              const isSetter = z.pos === setterPosition;
              const isLibero = info?.role === 'L';
              return (
                <div
                  key={z.z}
                  className={`relative flex items-center justify-center ${
                    idx < 2 ? 'border-r border-white/15' : ''
                  } hover:bg-white/5 transition-colors`}
                >
                  {/* Position label P1-P6 */}
                  <span
                    className={`absolute top-1 ${side === 'left' ? 'left-1' : 'right-1'} text-[9px] font-bold tracking-wider ${
                      isSetter ? 'text-warning' : 'text-white/40'
                    }`}
                  >
                    P{z.pos}
                  </span>

                  {/* Background zone number */}
                  <span
                    className="absolute text-6xl font-black italic leading-none select-none"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'rgba(255,255,255,0.07)' }}
                  >
                    {z.z}
                  </span>

                  {/* Player */}
                  {info && (
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative">
                        <div
                          className={`size-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                            isSetter
                              ? 'ring-2 ring-warning ring-offset-2 ring-offset-transparent'
                              : ''
                          } ${
                            isLibero
                              ? 'bg-yellow-700 border-2 border-yellow-400'
                              : teamColor === 'home'
                              ? 'bg-blue-700 border-2 border-blue-400'
                              : 'bg-red-700 border-2 border-red-400'
                          }`}
                        >
                          {info.number}
                        </div>
                        {isSetter && (
                          <span
                            className="absolute -top-1.5 -right-1.5 bg-warning text-background text-[8px] font-black px-1 rounded shadow"
                            title="Setter / Palleggiatore"
                          >
                            S
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-white/70 mt-1 font-medium">
                        {info.name.slice(0, 7)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      {/* Net top label */}
      <div className="relative h-8 flex items-center justify-center mb-1 overflow-hidden rounded-t-lg bg-zinc-900/80 border-x border-t border-border">
        <div className="absolute top-0 w-full h-0.5 bg-foreground/20" />
        <span className="relative z-10 text-[10px] font-bold tracking-[0.5em] text-muted-foreground uppercase">
          RETE
        </span>
      </div>

      <div
        className="flex border border-foreground/20 shadow-2xl rounded-b-lg overflow-hidden aspect-[24/7] relative"
        style={{
          background: 'linear-gradient(180deg, hsl(215 70% 32%) 0%, hsl(215 70% 22%) 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        <Half
          zones={AWAY_ZONES}
          teamLabel={awayTeam.name || 'OSPITE'}
          teamColor="away"
          lineup={matchState.awayCurrentLineup}
          setterPosition={matchState.awaySetterPosition}
          side="left"
        />

        {/* Center / net line */}
        <div className="w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />

        <Half
          zones={HOME_ZONES}
          teamLabel={homeTeam.name || 'CASA'}
          teamColor="home"
          lineup={matchState.homeCurrentLineup}
          setterPosition={matchState.homeSetterPosition}
          side="right"
        />
      </div>
    </div>
  );
}
