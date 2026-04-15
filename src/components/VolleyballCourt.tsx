import { useMatchStore } from '@/store/matchStore';

export function VolleyballCourt() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find(p => p.number === num);
    return player ? { number: num, name: player.lastName, role: player.role } : { number: num, name: `#${num}`, role: '' };
  };

  // Court positions (viewed from above):
  // Home team bottom, Away team top
  // P4(FL) P3(FC) P2(FR) - front row
  // P5(BL) P6(BC) P1(BR) - back row
  const homePositions = [
    { pos: 4, x: 15, y: 62, label: 'P4' },
    { pos: 3, x: 50, y: 62, label: 'P3' },
    { pos: 2, x: 85, y: 62, label: 'P2' },
    { pos: 5, x: 15, y: 85, label: 'P5' },
    { pos: 6, x: 50, y: 85, label: 'P6' },
    { pos: 1, x: 85, y: 85, label: 'P1' },
  ];

  const awayPositions = [
    { pos: 2, x: 15, y: 38, label: 'P2' },
    { pos: 3, x: 50, y: 38, label: 'P3' },
    { pos: 4, x: 85, y: 38, label: 'P4' },
    { pos: 1, x: 15, y: 15, label: 'P1' },
    { pos: 6, x: 50, y: 15, label: 'P6' },
    { pos: 5, x: 85, y: 15, label: 'P5' },
  ];

  return (
    <div className="court-gradient rounded-xl border border-court-line/20 p-3 relative aspect-[3/4]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Court outline */}
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="hsl(var(--court-line))" strokeWidth="0.5" opacity="0.4" rx="2" />
        
        {/* Net / Center line */}
        <line x1="5" y1="50" x2="95" y2="50" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.6" />
        <text x="50" y="52" textAnchor="middle" fill="hsl(var(--primary))" fontSize="2.5" opacity="0.8" fontWeight="bold">RETE</text>
        
        {/* 3m attack lines */}
        <line x1="5" y1="40" x2="95" y2="40" stroke="hsl(var(--court-line))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.3" />
        <line x1="5" y1="60" x2="95" y2="60" stroke="hsl(var(--court-line))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.3" />

        {/* Zone numbers */}
        {[1,2,3,4,5,6,7,8,9].map(zone => {
          const zonePositions: Record<number, {x: number, y: number}> = {
            1: {x: 85, y: 79}, 2: {x: 85, y: 65}, 3: {x: 50, y: 65},
            4: {x: 15, y: 65}, 5: {x: 15, y: 79}, 6: {x: 50, y: 79},
            7: {x: 15, y: 94}, 8: {x: 50, y: 94}, 9: {x: 85, y: 94},
          };
          const p = zonePositions[zone];
          if (!p) return null;
          return (
            <text key={zone} x={p.x} y={p.y} textAnchor="middle" fill="hsl(var(--court-line))" fontSize="2" opacity="0.2" fontWeight="bold">
              Z{zone}
            </text>
          );
        })}

        {/* Home team players */}
        {homePositions.map((pos, i) => {
          const playerNum = matchState.homeCurrentLineup[pos.pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, 'home');
          return (
            <g key={`home-${i}`}>
              <circle cx={pos.x} cy={pos.y} r="5" fill="hsl(220 60% 30%)" stroke="hsl(220 80% 50%)" strokeWidth="0.5" />
              <text x={pos.x} y={pos.y + 1.2} textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="1.8">
                {info.name.slice(0, 6)}
              </text>
            </g>
          );
        })}

        {/* Away team players */}
        {awayPositions.map((pos, i) => {
          const playerNum = matchState.awayCurrentLineup[pos.pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, 'away');
          return (
            <g key={`away-${i}`}>
              <circle cx={pos.x} cy={pos.y} r="5" fill="hsl(0 60% 30%)" stroke="hsl(0 80% 50%)" strokeWidth="0.5" />
              <text x={pos.x} y={pos.y + 1.2} textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold">
                {info.number}
              </text>
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="1.8">
                {info.name.slice(0, 6)}
              </text>
            </g>
          );
        })}

        {/* Team labels */}
        <text x="50" y="98" textAnchor="middle" fill="hsl(220 80% 60%)" fontSize="2" fontWeight="bold" opacity="0.7">
          {homeTeam.name || 'CASA'}
        </text>
        <text x="50" y="4" textAnchor="middle" fill="hsl(0 80% 60%)" fontSize="2" fontWeight="bold" opacity="0.7">
          {awayTeam.name || 'OSPITE'}
        </text>
      </svg>
    </div>
  );
}
