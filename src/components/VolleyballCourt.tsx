import { useMatchStore } from '@/store/matchStore';

interface ZoneCourtProps {
  onZoneClick?: (zone: number) => void;
  highlightedZone?: number | null;
  startZone?: number | null;
  endZone?: number | null;
  mode?: 'display' | 'select-start' | 'select-end';
  side?: 'home' | 'away'; // which side is being scouted
}

// DVW zones for the team's half:
// Front row: 4(left) 3(center) 2(right)
// Back row:  5(left) 6(center) 1(right)
// Extended:  7(left-back) 8(center-back) 9(right-back)

const ZONE_LAYOUT = [
  // Front row (near net)
  { zone: 4, x: 5, y: 2, w: 30, h: 30, label: '4' },
  { zone: 3, x: 35, y: 2, w: 30, h: 30, label: '3' },
  { zone: 2, x: 65, y: 2, w: 30, h: 30, label: '2' },
  // Back row
  { zone: 5, x: 5, y: 32, w: 30, h: 30, label: '5' },
  { zone: 6, x: 35, y: 32, w: 30, h: 30, label: '6' },
  { zone: 1, x: 65, y: 32, w: 30, h: 30, label: '1' },
  // Extended back
  { zone: 7, x: 5, y: 62, w: 30, h: 18, label: '7' },
  { zone: 8, x: 35, y: 62, w: 30, h: 18, label: '8' },
  { zone: 9, x: 65, y: 62, w: 30, h: 18, label: '9' },
];

export function ZoneCourt({ onZoneClick, highlightedZone, startZone, endZone, mode = 'display', side = 'home' }: ZoneCourtProps) {
  const isSelectable = mode === 'select-start' || mode === 'select-end';

  return (
    <svg viewBox="0 0 100 82" className="w-full">
      {/* Court outline */}
      <rect x="4" y="1" width="92" height="80" rx="2" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.5" opacity="0.5" />

      {/* Net line */}
      <line x1="4" y1="1" x2="96" y2="1" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.7" />
      <text x="50" y="0" textAnchor="middle" fill="hsl(var(--primary))" fontSize="2.5" opacity="0.5" fontWeight="bold">RETE</text>

      {/* 3m attack line */}
      <line x1="4" y1="32" x2="96" y2="32" stroke="hsl(var(--court-line))" strokeWidth="0.3" strokeDasharray="2,1" opacity="0.3" />

      {/* Zones */}
      {ZONE_LAYOUT.map(z => {
        const isStart = startZone === z.zone;
        const isEnd = endZone === z.zone;
        const isHighlighted = highlightedZone === z.zone;

        let fillColor = 'transparent';
        let strokeColor = 'hsl(var(--court-line))';
        let strokeOpacity = 0.15;
        let textOpacity = 0.35;

        if (isStart) {
          fillColor = 'hsl(var(--primary) / 0.25)';
          strokeColor = 'hsl(var(--primary))';
          strokeOpacity = 0.8;
          textOpacity = 1;
        } else if (isEnd) {
          fillColor = 'hsl(var(--accent) / 0.25)';
          strokeColor = 'hsl(var(--accent))';
          strokeOpacity = 0.8;
          textOpacity = 1;
        } else if (isHighlighted) {
          fillColor = 'hsl(var(--primary) / 0.1)';
          strokeOpacity = 0.4;
          textOpacity = 0.7;
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
              strokeWidth={isStart || isEnd ? '0.8' : '0.3'}
              opacity={strokeOpacity}
              className={isSelectable ? 'cursor-pointer' : ''}
              onClick={() => isSelectable && onZoneClick?.(z.zone)}
            />
            <text
              x={z.x + z.w / 2}
              y={z.y + z.h / 2 + 2}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize={z.zone >= 7 ? '4' : '5'}
              fontWeight="bold"
              opacity={textOpacity}
              className={isSelectable ? 'cursor-pointer pointer-events-none' : 'pointer-events-none'}
            >
              {z.label}
            </text>
          </g>
        );
      })}

      {/* Trajectory arrow */}
      {startZone && endZone && (
        (() => {
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
                  <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--primary))" opacity="0.8" />
                </marker>
              </defs>
              <line
                x1={sx} y1={sy} x2={ex} y2={ey}
                stroke="hsl(var(--primary))"
                strokeWidth="0.8"
                opacity="0.6"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })()
      )}
    </svg>
  );
}

export function VolleyballCourt() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find(p => p.number === num);
    return player ? { number: num, name: player.lastName, role: player.role } : { number: num, name: `#${num}`, role: '' };
  };

  // Court layout: Home bottom, Away top
  const homePositions = [
    { pos: 4, x: 15, y: 62, label: 'P4' },
    { pos: 3, x: 50, y: 62, label: 'P3' },
    { pos: 2, x: 85, y: 62, label: 'P2' },
    { pos: 5, x: 15, y: 82, label: 'P5' },
    { pos: 6, x: 50, y: 82, label: 'P6' },
    { pos: 1, x: 85, y: 82, label: 'P1' },
  ];

  const awayPositions = [
    { pos: 2, x: 15, y: 38, label: 'P2' },
    { pos: 3, x: 50, y: 38, label: 'P3' },
    { pos: 4, x: 85, y: 38, label: 'P4' },
    { pos: 1, x: 15, y: 18, label: 'P1' },
    { pos: 6, x: 50, y: 18, label: 'P6' },
    { pos: 5, x: 85, y: 18, label: 'P5' },
  ];

  return (
    <div className="court-gradient rounded-xl border border-court-line/20 p-3 relative">
      <svg viewBox="0 0 100 100" className="w-full">
        {/* Court outline */}
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.5" opacity="0.4" rx="2" />

        {/* Zone grid - Home half (bottom) */}
        {/* Front row zones */}
        <rect x="5" y="55" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="35" y="55" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="65" y="55" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        {/* Back row zones */}
        <rect x="5" y="75" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="35" y="75" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="65" y="75" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />

        {/* Zone numbers - Home */}
        <text x="20" y="67" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">4</text>
        <text x="50" y="67" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">3</text>
        <text x="80" y="67" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">2</text>
        <text x="20" y="87" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">5</text>
        <text x="50" y="87" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">6</text>
        <text x="80" y="87" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">1</text>

        {/* Zone grid - Away half (top) */}
        <rect x="5" y="5" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="35" y="5" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="65" y="5" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="5" y="25" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="35" y="25" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />
        <rect x="65" y="25" width="30" height="20" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.2" opacity="0.15" />

        {/* Zone numbers - Away */}
        <text x="20" y="17" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">5</text>
        <text x="50" y="17" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">6</text>
        <text x="80" y="17" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">1</text>
        <text x="20" y="37" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">2</text>
        <text x="50" y="37" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">3</text>
        <text x="80" y="37" textAnchor="middle" fill="hsl(var(--court-line))" fontSize="3" opacity="0.2" fontWeight="bold">4</text>

        {/* Net / Center line */}
        <line x1="5" y1="50" x2="95" y2="50" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.6" />
        <text x="50" y="52" textAnchor="middle" fill="hsl(var(--primary))" fontSize="2.5" opacity="0.8" fontWeight="bold">RETE</text>

        {/* 3m attack lines */}
        <line x1="5" y1="35" x2="95" y2="35" stroke="hsl(var(--court-line))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.3" />
        <line x1="5" y1="65" x2="95" y2="65" stroke="hsl(var(--court-line))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.3" />

        {/* Home team players */}
        {homePositions.map((pos) => {
          const playerNum = matchState.homeCurrentLineup[pos.pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, 'home');
          return (
            <g key={`home-${pos.pos}`}>
              <circle cx={pos.x} cy={pos.y} r="5.5" fill="hsl(220 60% 25%)" stroke="hsl(220 80% 50%)" strokeWidth="0.6" />
              <text x={pos.x} y={pos.y + 1.5} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="2">
                {info.name.slice(0, 5)}
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
              <circle cx={pos.x} cy={pos.y} r="5.5" fill="hsl(0 60% 25%)" stroke="hsl(0 80% 50%)" strokeWidth="0.6" />
              <text x={pos.x} y={pos.y + 1.5} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="2">
                {info.name.slice(0, 5)}
              </text>
            </g>
          );
        })}

        {/* Team labels */}
        <text x="50" y="99" textAnchor="middle" fill="hsl(220 80% 60%)" fontSize="2.5" fontWeight="bold" opacity="0.7">
          {homeTeam.name || 'CASA'}
        </text>
        <text x="50" y="4" textAnchor="middle" fill="hsl(0 80% 60%)" fontSize="2.5" fontWeight="bold" opacity="0.7">
          {awayTeam.name || 'OSPITE'}
        </text>
      </svg>
    </div>
  );
}
