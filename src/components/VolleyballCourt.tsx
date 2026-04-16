import { useMatchStore } from '@/store/matchStore';

interface ZoneCourtProps {
  onZoneClick?: (zone: number) => void;
  highlightedZone?: number | null;
  startZone?: number | null;
  endZone?: number | null;
  mode?: 'display' | 'select-start' | 'select-end';
  side?: 'home' | 'away';
}

// DVW / Click&Scout zone numbering (viewed from behind end line):
// Front row (near net): 4(left)  3(center)  2(right)
// Back row:             5(left)  6(center)  1(right)
// Behind end line:      7(left)  8(center)  9(right)

const CELL = 30; // each zone is a perfect square
const GAP = 1;
const MARGIN = 2;
const COLS = 3;
const ROWS = 3;
const COURT_W = MARGIN * 2 + COLS * CELL + (COLS - 1) * GAP; // 96
const COURT_H = MARGIN * 2 + ROWS * CELL + (ROWS - 1) * GAP; // 96

function zoneRect(col: number, row: number) {
  return {
    x: MARGIN + col * (CELL + GAP),
    y: MARGIN + row * (CELL + GAP),
    w: CELL,
    h: CELL,
  };
}

// Grid positions: row 0 = front (net), row 1 = back, row 2 = behind end line
const ZONE_LAYOUT = [
  { zone: 4, ...zoneRect(0, 0) },
  { zone: 3, ...zoneRect(1, 0) },
  { zone: 2, ...zoneRect(2, 0) },
  { zone: 5, ...zoneRect(0, 1) },
  { zone: 6, ...zoneRect(1, 1) },
  { zone: 1, ...zoneRect(2, 1) },
  { zone: 7, ...zoneRect(0, 2) },
  { zone: 8, ...zoneRect(1, 2) },
  { zone: 9, ...zoneRect(2, 2) },
];

export function ZoneCourt({ onZoneClick, highlightedZone, startZone, endZone, mode = 'display' }: ZoneCourtProps) {
  const isSelectable = mode === 'select-start' || mode === 'select-end';

  return (
    <svg viewBox={`0 0 ${COURT_W} ${COURT_H}`} className="w-full max-w-md">
      {/* Taraflex floor */}
      <rect x="0" y="0" width={COURT_W} height={COURT_H} rx="3" fill="hsl(24 40% 28%)" />

      {/* Court area (zones 1-6) */}
      <rect
        x={MARGIN}
        y={MARGIN}
        width={COLS * CELL + (COLS - 1) * GAP}
        height={2 * CELL + GAP}
        rx="1"
        fill="hsl(24 50% 32%)"
      />

      {/* Behind-end-line area (zones 7-8-9) — slightly darker */}
      <rect
        x={MARGIN}
        y={MARGIN + 2 * (CELL + GAP)}
        width={COLS * CELL + (COLS - 1) * GAP}
        height={CELL}
        rx="1"
        fill="hsl(24 35% 24%)"
      />

      {/* Net line at top */}
      <line x1={MARGIN} y1={MARGIN} x2={COURT_W - MARGIN} y2={MARGIN} stroke="white" strokeWidth="1.5" />
      <text x={COURT_W / 2} y={MARGIN - 1} textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold" opacity="0.6">
        RETE
      </text>

      {/* 3m attack line */}
      <line
        x1={MARGIN}
        y1={MARGIN + CELL + GAP / 2}
        x2={COURT_W - MARGIN}
        y2={MARGIN + CELL + GAP / 2}
        stroke="white"
        strokeWidth="0.6"
        strokeDasharray="3,2"
        opacity="0.5"
      />

      {/* End line */}
      <line
        x1={MARGIN}
        y1={MARGIN + 2 * CELL + GAP + GAP / 2}
        x2={COURT_W - MARGIN}
        y2={MARGIN + 2 * CELL + GAP + GAP / 2}
        stroke="white"
        strokeWidth="0.8"
        opacity="0.7"
      />

      {/* Side lines */}
      <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={MARGIN + 2 * CELL + GAP} stroke="white" strokeWidth="0.8" opacity="0.7" />
      <line x1={COURT_W - MARGIN} y1={MARGIN} x2={COURT_W - MARGIN} y2={MARGIN + 2 * CELL + GAP} stroke="white" strokeWidth="0.8" opacity="0.7" />

      {/* Zones */}
      {ZONE_LAYOUT.map(z => {
        const isStart = startZone === z.zone;
        const isEnd = endZone === z.zone;
        const isHighlighted = highlightedZone === z.zone;
        const isBehind = z.zone >= 7;

        let fillColor = 'transparent';
        let strokeColor = 'rgba(255,255,255,0.15)';
        let strokeW = 0.4;
        let textColor = 'rgba(255,255,255,0.5)';

        if (isStart) {
          fillColor = 'rgba(59,130,246,0.35)';
          strokeColor = 'rgba(59,130,246,0.9)';
          strokeW = 1.2;
          textColor = 'white';
        } else if (isEnd) {
          fillColor = 'rgba(16,185,129,0.35)';
          strokeColor = 'rgba(16,185,129,0.9)';
          strokeW = 1.2;
          textColor = 'white';
        } else if (isHighlighted) {
          fillColor = 'rgba(255,255,255,0.08)';
          strokeColor = 'rgba(255,255,255,0.3)';
          textColor = 'rgba(255,255,255,0.7)';
        }

        return (
          <g key={z.zone}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="1.5"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeW}
              className={isSelectable ? 'cursor-pointer hover:fill-[rgba(255,255,255,0.1)]' : ''}
              onClick={() => isSelectable && onZoneClick?.(z.zone)}
            />
            <text
              x={z.x + z.w / 2}
              y={z.y + z.h / 2 + 3}
              textAnchor="middle"
              fill={textColor}
              fontSize="8"
              fontWeight="bold"
              className={isSelectable ? 'cursor-pointer pointer-events-none' : 'pointer-events-none'}
            >
              {z.zone}
            </text>
            {isBehind && (
              <text
                x={z.x + z.w / 2}
                y={z.y + z.h / 2 + 9}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize="2.5"
                className="pointer-events-none"
              >
                fuori
              </text>
            )}
          </g>
        );
      })}

      {/* Trajectory arrow */}
      {startZone && endZone && (() => {
        const sz = ZONE_LAYOUT.find(z => z.zone === startZone);
        const ez = ZONE_LAYOUT.find(z => z.zone === endZone);
        if (!sz || !ez) return null;
        const sx = sz.x + sz.w / 2;
        const sy = sz.y + sz.h / 2;
        const ex = ez.x + ez.w / 2;
        const ey = ez.y + ez.h / 2;
        return (
          <g>
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="rgba(59,130,246,0.9)" />
              </marker>
            </defs>
            <line
              x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="rgba(59,130,246,0.7)"
              strokeWidth="1.2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      })()}
    </svg>
  );
}

// Full court with both teams (landscape orientation)
export function VolleyballCourt() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find(p => p.number === num);
    return player ? { number: num, name: player.lastName, role: player.role } : { number: num, name: `#${num}`, role: '' };
  };

  // Court is 18x9m → viewBox 180x90, each half 90x90
  const W = 180;
  const H = 90;
  const HALF = 90;
  const M = 4; // margin

  // Home = right half, Away = left half
  // Zone positions within each half (centered in zone cells)
  const homePositions = [
    { pos: 4, x: HALF + 15, y: 22.5 },   // front left
    { pos: 3, x: HALF + 45, y: 22.5 },   // front center
    { pos: 2, x: HALF + 75, y: 22.5 },   // front right
    { pos: 5, x: HALF + 15, y: 67.5 },   // back left
    { pos: 6, x: HALF + 45, y: 67.5 },   // back center
    { pos: 1, x: HALF + 75, y: 67.5 },   // back right
  ];

  const awayPositions = [
    { pos: 2, x: 15, y: 22.5 },
    { pos: 3, x: 45, y: 22.5 },
    { pos: 4, x: 75, y: 22.5 },
    { pos: 1, x: 15, y: 67.5 },
    { pos: 6, x: 45, y: 67.5 },
    { pos: 5, x: 75, y: 67.5 },
  ];

  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      <svg viewBox={`-${M} -${M} ${W + M * 2} ${H + M * 2}`} className="w-full">
        {/* Taraflex floor */}
        <rect x={-M} y={-M} width={W + M * 2} height={H + M * 2} rx="4" fill="hsl(24 40% 28%)" />

        {/* Court surface */}
        <rect x="0" y="0" width={W} height={H} fill="hsl(24 50% 32%)" rx="1" />

        {/* Court outline */}
        <rect x="0" y="0" width={W} height={H} fill="none" stroke="white" strokeWidth="1" rx="1" />

        {/* Net / center line */}
        <line x1={HALF} y1={-M} x2={HALF} y2={H + M} stroke="white" strokeWidth="1.5" />

        {/* 3m attack lines */}
        <line x1={HALF - 30} y1="0" x2={HALF - 30} y2={H} stroke="white" strokeWidth="0.6" strokeDasharray="3,2" opacity="0.6" />
        <line x1={HALF + 30} y1="0" x2={HALF + 30} y2={H} stroke="white" strokeWidth="0.6" strokeDasharray="3,2" opacity="0.6" />

        {/* Zone grid lines — Away half */}
        <line x1="30" y1="0" x2="30" y2={H} stroke="white" strokeWidth="0.3" opacity="0.15" />
        <line x1="60" y1="0" x2="60" y2={H} stroke="white" strokeWidth="0.3" opacity="0.15" />
        <line x1="0" y1="45" x2={HALF} y2="45" stroke="white" strokeWidth="0.3" opacity="0.15" />

        {/* Zone grid lines — Home half */}
        <line x1={HALF + 30} y1="0" x2={HALF + 30} y2={H} stroke="white" strokeWidth="0.3" opacity="0.15" />
        <line x1={HALF + 60} y1="0" x2={HALF + 60} y2={H} stroke="white" strokeWidth="0.3" opacity="0.15" />
        <line x1={HALF} y1="45" x2={W} y2="45" stroke="white" strokeWidth="0.3" opacity="0.15" />

        {/* Zone numbers — Away */}
        {[
          { z: 2, x: 15, y: 25 }, { z: 3, x: 45, y: 25 }, { z: 4, x: 75, y: 25 },
          { z: 1, x: 15, y: 70 }, { z: 6, x: 45, y: 70 }, { z: 5, x: 75, y: 70 },
        ].map(zn => (
          <text key={`az-${zn.z}`} x={zn.x} y={zn.y} textAnchor="middle" fill="white" fontSize="6" opacity="0.12" fontWeight="bold">
            {zn.z}
          </text>
        ))}

        {/* Zone numbers — Home */}
        {[
          { z: 4, x: HALF + 15, y: 25 }, { z: 3, x: HALF + 45, y: 25 }, { z: 2, x: HALF + 75, y: 25 },
          { z: 5, x: HALF + 15, y: 70 }, { z: 6, x: HALF + 45, y: 70 }, { z: 1, x: HALF + 75, y: 70 },
        ].map(zn => (
          <text key={`hz-${zn.z}`} x={zn.x} y={zn.y} textAnchor="middle" fill="white" fontSize="6" opacity="0.12" fontWeight="bold">
            {zn.z}
          </text>
        ))}

        {/* Team labels */}
        <text x={HALF / 2} y={H + M - 1} textAnchor="middle" fill="hsl(0 80% 65%)" fontSize="4" fontWeight="bold" opacity="0.7">
          {awayTeam.name || 'OSPITE'}
        </text>
        <text x={HALF + HALF / 2} y={H + M - 1} textAnchor="middle" fill="hsl(220 80% 65%)" fontSize="4" fontWeight="bold" opacity="0.7">
          {homeTeam.name || 'CASA'}
        </text>

        {/* Net label */}
        <text x={HALF} y={-1} textAnchor="middle" fill="white" fontSize="3" fontWeight="bold" opacity="0.4">
          RETE
        </text>

        {/* Home team players */}
        {homePositions.map((pos) => {
          const playerNum = matchState.homeCurrentLineup[pos.pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, 'home');
          return (
            <g key={`home-${pos.pos}`}>
              <circle cx={pos.x} cy={pos.y} r="7" fill="hsl(220 60% 30%)" stroke="hsl(220 80% 55%)" strokeWidth="0.8" />
              <text x={pos.x} y={pos.y + 2} textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2.5">
                {info.name.slice(0, 6)}
              </text>
            </g>
          );
        })}

        {/* Away team players */}
        {awayPositions.map((pos) => {
          const playerNum = matchState.awayCurrentLineup[pos.pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, 'away');
          return (
            <g key={`away-${pos.pos}`}>
              <circle cx={pos.x} cy={pos.y} r="7" fill="hsl(0 60% 30%)" stroke="hsl(0 80% 55%)" strokeWidth="0.8" />
              <text x={pos.x} y={pos.y + 2} textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2.5">
                {info.name.slice(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
