import { useEffect, useRef, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { getReceptionPositions } from '@/lib/receptionFormations';

interface ZoneCourtProps {
  onZoneClick?: (zone: number) => void;
  highlightedZone?: number | null;
  startZone?: number | null;
  endZone?: number | null;
  mode?: 'display' | 'select-start' | 'select-end';
  side?: 'home' | 'away';
  skill?: string | null;
  large?: boolean;
  suggestedZone?: number;
}

type Zone = { zone: number; col: number; row: number; label: string; areaLabel: string };
const ZONES: Zone[] = [
  { zone: 4, col: 0, row: 0, label: 'Front Left',   areaLabel: 'Palla alta sx' },
  { zone: 3, col: 1, row: 0, label: 'Front Middle', areaLabel: 'Primo tempo' },
  { zone: 2, col: 2, row: 0, label: 'Front Right',  areaLabel: 'Palla alta dx' },
  { zone: 5, col: 0, row: 1, label: 'Back Left',    areaLabel: 'Back sx' },
  { zone: 6, col: 1, row: 1, label: 'Back Middle',  areaLabel: 'Pipe' },
  { zone: 1, col: 2, row: 1, label: 'Back Right',   areaLabel: 'Back dx' },
  { zone: 7, col: 0, row: 2, label: 'Deep Left',    areaLabel: 'Fondo sx' },
  { zone: 8, col: 1, row: 2, label: 'Deep Middle',  areaLabel: 'Fondo cent.' },
  { zone: 9, col: 2, row: 2, label: 'Deep Right',   areaLabel: 'Fondo dx' },
];

// Proporzioni reali: front row corta (vicino rete), back e fondo più profondi
const ROW_TEMPLATE = '25% 35% 40%';
const ROW_BG: Record<number, string> = {
  0: 'rgba(255,255,255,0.06)',   // front (4,3,2) — leggermente più chiaro
  1: 'rgba(0,0,0,0.00)',         // back  (5,6,1) — neutro
  2: 'rgba(0,0,0,0.12)',         // deep  (7,8,9) — leggermente più scuro
};

const SERVICE_ZONES = [
  { zone: 7, label: 'Sinistra' },
  { zone: 8, label: 'Centro' },
  { zone: 9, label: 'Destra' },
];

const courtBg = 'hsl(28 70% 55%)';
const serviceBg = 'hsl(220 50% 15%)';

export function ZoneCourt({
  onZoneClick,
  highlightedZone,
  startZone,
  endZone,
  mode = 'display',
  skill,
  large = false,
  suggestedZone,
}: ZoneCourtProps) {
  const startIsServe = mode === 'select-start' && skill === 'S';
  const zonesSelectable = mode !== 'display' && !startIsServe;
  const serviceSelectable = startIsServe;
  const showServiceBand = startIsServe;

  const cellState = (z: number) => {
    if (startZone === z) return 'start';
    if (endZone === z) return 'end';
    if (highlightedZone === z) return 'hl';
    return 'idle';
  };

  const zonePos = (zone: number) => {
    const z = ZONES.find((zz) => zz.zone === zone);
    if (!z) return null;
    // Centri Y in base alle nuove proporzioni 25/35/40
    const yCenters = [12.5, 42.5, 80];
    return { x: (z.col + 0.5) * (100 / 3), y: yCenters[z.row] };
  };

  const startPos = startZone ? zonePos(startZone) : null;
  const endPos = endZone ? zonePos(endZone) : null;
  const showArrow = startPos && endPos && startZone !== endZone;

  return (
    <div className="w-full">
      <div className="relative h-7 flex items-center justify-center overflow-hidden rounded-t-lg bg-muted border-x border-t border-border">
        <div className="absolute top-0 w-full h-0.5 bg-foreground/25" />
        <span className="relative z-10 text-[10px] font-bold tracking-[0.5em] text-muted-foreground uppercase">RETE</span>
      </div>

      <div
        className={`relative grid grid-cols-3 overflow-hidden border border-foreground/25 shadow-2xl ${showServiceBand ? '' : 'rounded-b-lg'} ${large ? 'aspect-[1/1]' : 'aspect-square'}`}
        style={{ background: courtBg, boxShadow: 'inset 0 0 70px rgba(0,0,0,0.22)', gridTemplateRows: ROW_TEMPLATE }}
      >
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 90 90" preserveAspectRatio="none">
          {[30, 60].map((p) => (
            <line key={`v-${p}`} x1={p} y1="0" x2={p} y2="90" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Linee orizzontali alle nuove proporzioni: 25% e 60% (front/back/deep) */}
          {[22.5, 54].map((p, i) => (
            <line key={`h-${i}`} x1="0" y1={p} x2="90" y2={p} stroke={i === 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)'} strokeWidth={i === 0 ? 1.6 : 1} strokeDasharray={i === 0 ? '0' : '4 4'} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {ZONES.map((z) => {
          const state = cellState(z.zone);
          const active = state === 'start' || state === 'end' || state === 'hl';
          return (
            <button
              type="button"
              key={z.zone}
              onClick={() => zonesSelectable && onZoneClick?.(z.zone)}
              disabled={!zonesSelectable}
              style={{ backgroundColor: ROW_BG[z.row] }}
              className={`relative flex items-center justify-center overflow-hidden transition-all duration-75 [touch-action:manipulation] ${
                zonesSelectable ? 'cursor-pointer hover:bg-white/10 active:brightness-125 active:scale-95' : 'cursor-default'
              } ${state === 'start' ? 'bg-primary/35 ring-2 ring-primary ring-inset' : ''} ${state === 'end' ? 'bg-accent/35 ring-2 ring-accent ring-inset' : ''} ${state === 'hl' ? 'bg-white/10' : ''} ${suggestedZone === z.zone ? 'ring-2 ring-primary/60 animate-pulse' : ''}`}
            >
              {/* Numero zona piccolo in angolo */}
              <span className={`absolute left-1.5 top-1 text-[11px] font-black leading-none ${active ? 'text-white/85' : 'text-white/60'}`}>
                {z.zone}
              </span>
              {/* Label area al centro */}
              <span className={`select-none text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-center px-1 leading-tight ${active ? 'text-white/90' : 'text-white/40'}`}>
                {z.areaLabel}
              </span>
            </button>
          );
        })}

        {showArrow && (
          <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--accent))" />
              </marker>
            </defs>
            <line x1={startPos!.x} y1={startPos!.y} x2={endPos!.x} y2={endPos!.y} stroke="hsl(var(--accent))" strokeWidth="0.9" strokeLinecap="round" strokeDasharray="3 2" markerEnd="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
            <circle cx={startPos!.x} cy={startPos!.y} r="1.8" fill="hsl(var(--primary))" stroke="white" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>

      {showServiceBand && (
        <div className="border-t-4 border-white">
          <div className="bg-muted px-2 py-1 text-center text-xs md:text-sm font-black uppercase tracking-[0.35em] text-muted-foreground">BATTUTA</div>
          <div className="grid grid-cols-3 rounded-b-lg overflow-hidden" style={{ background: serviceBg }}>
            {SERVICE_ZONES.map((s, index) => (
              <button
                key={s.zone}
                type="button"
                onClick={() => serviceSelectable && onZoneClick?.(s.zone)}
                className={`min-h-16 p-3 text-sm font-black uppercase tracking-wider text-white/85 transition-all duration-75 [touch-action:manipulation] active:brightness-125 active:scale-95 ${index < 2 ? 'border-r border-white/15' : ''} ${startZone === s.zone ? 'bg-primary/45 ring-2 ring-primary ring-inset' : 'hover:bg-white/10'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {startZone && endZone && (
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-primary/20 text-primary font-mono font-bold">{startZone}</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-accent/20 text-accent font-mono font-bold">{endZone}</span>
        </div>
      )}
    </div>
  );
}

type LiveArrow = { startZone: number; endZone: number; evaluation: string };

interface VolleyballCourtProps {
  highlightPlayerNumber?: number;
  highlightTeam?: 'home' | 'away';
  heatmapData?: Record<number, number>;
  liveArrows?: LiveArrow[];
  compactAspect?: boolean;
  /**
   * Quando true per una squadra, sostituisce le posizioni di rotazione (P1..P6)
   * con le posizioni di ricezione personalizzate per la rotazione del palleggiatore corrente.
   */
  receptionMode?: { home?: boolean; away?: boolean };
  /** Nasconde label, watermark zone, badge P{pos} e frecce vecchie.
   *  Lascia solo cerchi numerati — massima leggibilità su tablet. */
  simplifiedView?: boolean;
}

export function VolleyballCourt({
  highlightPlayerNumber,
  highlightTeam,
  heatmapData,
  liveArrows,
  compactAspect,
  receptionMode,
  simplifiedView = false,
}: VolleyballCourtProps = {}) {
  const { matchState, homeTeam, awayTeam, homeReceptionFormations, awayReceptionFormations } = useMatchStore();

  // Highlight pulsante del server: si attiva al cambio di squadra al servizio e si spegne dopo 3s
  const [serverPulseActive, setServerPulseActive] = useState(true);
  const lastServingRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${matchState.servingTeam}-${matchState.homeScore}-${matchState.awayScore}`;
    if (lastServingRef.current !== key) {
      lastServingRef.current = key;
      setServerPulseActive(true);
      const t = setTimeout(() => setServerPulseActive(false), 3000);
      return () => clearTimeout(t);
    }
  }, [matchState.servingTeam, matchState.homeScore, matchState.awayScore]);

  const getPlayerInfo = (num: number, team: 'home' | 'away') => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const player = teamData.players.find((p) => p.number === num);
    return player
      ? { number: num, name: player.lastName, role: player.role, isLibero: player.isLibero }
      : { number: num, name: `#${num}`, role: undefined, isLibero: false };
  };

  // === Layout FIVB / DataVolley (Phase 11) ===
  // Il campo è renderizzato orizzontalmente con la NET verticale al centro.
  // AWAY: half sinistro, net sul lato destro (x=100). Coach @ x=0 guarda verso +x.
  //   → Front row vicino alla rete (x≈78), back row lontano (x≈28).
  //   → Asse y: coach guarda +x quindi la sua DESTRA è in basso (y=100) e la SINISTRA in alto.
  // HOME: half destro, net sul lato sinistro (x=0). Coach @ x=100 guarda verso -x.
  //   → Front row vicino alla rete (x≈22), back row lontano (x≈72).
  //   → Asse y: coach guarda -x quindi la sua DESTRA è in alto (y=0) e la SINISTRA in basso.
  // Convenzione FIVB: P2=front-right, P3=front-center, P4=front-left,
  //                   P1=back-right (battitore), P6=back-center, P5=back-left.
  const positions: Record<number, { zone: number; x: number; y: number }> = {
    // AWAY
    2: { zone: 2, x: 78, y: 78 },   // front-right (coach destro = basso schermo)
    3: { zone: 3, x: 78, y: 50 },   // front-center
    4: { zone: 4, x: 78, y: 22 },   // front-left
    1: { zone: 1, x: 28, y: 78 },   // back-right (battitore)
    6: { zone: 6, x: 28, y: 50 },   // back-center
    5: { zone: 5, x: 28, y: 22 },   // back-left
  };

  const positionsHome: Record<number, { zone: number; x: number; y: number }> = {
    // HOME
    2: { zone: 2, x: 22, y: 22 },   // front-right (coach destro = alto schermo)
    3: { zone: 3, x: 22, y: 50 },   // front-center
    4: { zone: 4, x: 22, y: 78 },   // front-left
    1: { zone: 1, x: 72, y: 22 },   // back-right (battitore)
    6: { zone: 6, x: 72, y: 50 },   // back-center
    5: { zone: 5, x: 72, y: 78 },   // back-left
  };

  // Watermark zone numeriche: stesse coordinate dei giocatori per le 6 di rotazione,
  // più 7/8/9 nell'area di servizio (dietro la back row).
  const zoneLabels = [
    { zone: 4, x: 6,  y: 8  }, { zone: 3, x: 50, y: 8  }, { zone: 2, x: 94, y: 8  },
    { zone: 5, x: 6,  y: 50 }, { zone: 6, x: 50, y: 50 }, { zone: 1, x: 94, y: 50 },
    { zone: 7, x: 6,  y: 92 }, { zone: 8, x: 50, y: 92 }, { zone: 9, x: 94, y: 92 },
  ];

  const zoneLabelsHome = [
    { zone: 2, x: 6,  y: 8  }, { zone: 3, x: 50, y: 8  }, { zone: 4, x: 94, y: 8  },
    { zone: 1, x: 6,  y: 50 }, { zone: 6, x: 50, y: 50 }, { zone: 5, x: 94, y: 50 },
    { zone: 9, x: 6,  y: 92 }, { zone: 8, x: 50, y: 92 }, { zone: 7, x: 94, y: 92 },
  ];

  const zonePct = (zone: number) => {
    const z = zoneLabels.find(zl => zl.zone === zone);
    return z ? { x: z.x, y: z.y } : null;
  };

  const renderHalfCourt = (team: 'home' | 'away') => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const setterPosition = team === 'home' ? matchState.homeSetterPosition : matchState.awaySetterPosition;
    const showHeatmap = heatmapData && team === 'away';
    const maxHeat = heatmapData ? Math.max(...Object.values(heatmapData), 1) : 1;

    // Modalità ricezione: usa posizioni personalizzate per la rotazione attuale
    const isReceiving = team === 'home' ? !!receptionMode?.home : !!receptionMode?.away;
    const formations = team === 'home' ? homeReceptionFormations : awayReceptionFormations;
    // home ha la rete in basso → specchia y; away ha la rete in alto → no mirror
    const recPositions = isReceiving
      ? getReceptionPositions(formations, setterPosition, team === 'home')
      : null;

    return (
      <div className="relative h-full overflow-hidden" style={{ background: courtBg, boxShadow: 'inset 0 0 70px rgba(0,0,0,0.22)' }}>
        
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 90 90" preserveAspectRatio="none">
          {[30, 60].map((p) => {
            const is3m = (team === 'away' && p === 60) || (team === 'home' && p === 30);
            return (
              <line key={`v-${team}-${p}`} x1={p} y1="0" x2={p} y2="90"
                stroke={is3m ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'}
                strokeWidth={is3m ? 2 : 1}
                strokeDasharray={is3m ? '0' : '4 4'}
                vectorEffect="non-scaling-stroke" />
            );
          })}
          {[30, 60].map((p) => (
            <line key={`h-${team}-${p}`} x1="0" y1={p} x2="90" y2={p} stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {showHeatmap && zoneLabels.map((z) => {
          const count = heatmapData![z.zone] ?? 0;
          if (!count) return null;
          const opacity = Math.min(0.55, (count / maxHeat) * 0.55);
          return (
            <div
              key={`heat-${z.zone}`}
              className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${z.x}%`, top: `${z.y}%`,
                width: '28%', height: '28%',
                background: `radial-gradient(circle, hsl(0 84% 55% / ${opacity}) 0%, transparent 70%)`,
              }}
            />
          );
        })}
        {!simplifiedView && (team === 'home' ? zoneLabelsHome : zoneLabels).map((z) => (
          <span key={`${team}-z-${z.zone}`} className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 select-none text-xl md:text-2xl font-black italic text-white/15" style={{ left: `${z.x}%`, top: `${z.y}%` }}>
            {z.zone}
          </span>
        ))}
        {isReceiving && (
          <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full bg-accent/90 text-[9px] font-black uppercase tracking-wider text-accent-foreground shadow-md">
            Ricezione · S{setterPosition}
          </span>
        )}
        {[1, 2, 3, 4, 5, 6].map((pos) => {
          const playerNum = lineup[pos - 1];
          const info = playerNum ? getPlayerInfo(playerNum, team) : null;
          const basePos = team === 'home' ? positionsHome[pos] : positions[pos];
          const overridePos = recPositions ? recPositions[pos as 1|2|3|4|5|6] : null;
          const p = overridePos ?? basePos;
          const isSetter = pos === setterPosition;
          const isLibero = Boolean(info?.isLibero || info?.role === 'L');
          const isHighlighted = highlightTeam === team && highlightPlayerNumber === playerNum;

          const isFrontRow = pos === 2 || pos === 3 || pos === 4;
          return (
            <div
              key={`${team}-p-${pos}`}
              className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-300 ease-out"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {info && (
                <>
                  <div className={`relative flex size-11 md:size-[52px] items-center justify-center rounded-full text-base md:text-lg font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.7)] ${isSetter ? 'ring-2 ring-warning ring-offset-2 ring-offset-transparent' : ''} ${pos === 1 && matchState.servingTeam === team && serverPulseActive && !isSetter ? 'ring-2 ring-[hsl(var(--cs-cta))] animate-pulse' : ''} ${isHighlighted ? 'ring-4 ring-primary animate-pulse' : ''} ${isLibero ? 'bg-yellow-700 border-2 border-yellow-400' : team === 'home' ? 'bg-blue-700 border-2 border-blue-300' : 'bg-red-700 border-2 border-red-300'}`}>
                    {info.number}
                    {!simplifiedView && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-black/70 text-white rounded px-1 leading-tight">P{pos}</span>
                    )}
                    {isSetter && <span className="absolute -right-2 -bottom-2 rounded bg-warning px-1.5 py-0.5 text-[10px] font-black text-background">S</span>}
                  </div>
                  {!simplifiedView && (
                    <span className="mt-0.5 max-w-16 truncate text-[11px] md:text-xs font-bold text-white/95 drop-shadow">{info.name}</span>
                  )}
                </>
              )}
            </div>
          );
        })}
        {liveArrows && liveArrows.length > 0 && team === 'home' && (
          <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrow-live" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
              </marker>
            </defs>
            {liveArrows.slice(simplifiedView ? -1 : -5).map((arr, i, arrs) => {
              const from = zonePct(arr.startZone);
              const to = zonePct(arr.endZone);
              if (!from || !to || arr.startZone === arr.endZone) return null;
              const opacity = 0.2 + (i / Math.max(1, arrs.length - 1)) * 0.75;
              const color = arr.evaluation === '#' ? '#16a34a' : arr.evaluation === '=' ? '#dc2626' : '#ca8a04';
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={color} strokeWidth="0.9" strokeLinecap="round"
                  strokeDasharray="2 1" opacity={opacity}
                  markerEnd="url(#arrow-live)"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {(() => {
              const last = liveArrows[liveArrows.length - 1];
              if (!last) return null;
              const from = zonePct(last.startZone);
              const to = zonePct(last.endZone);
              if (!from || !to || last.startZone === last.endZone) return null;
              const pathD = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
              return (
                <g key={`ball-${liveArrows.length}-${last.startZone}-${last.endZone}`}>
                  <circle r="1.7" fill="hsl(24 95% 53%)" stroke="white" strokeWidth="0.4" vectorEffect="non-scaling-stroke">
                    <animateMotion dur="0.7s" repeatCount="1" fill="freeze" path={pathD} />
                    <animate attributeName="opacity" from="1" to="0" begin="0.7s" dur="0.5s" fill="freeze" />
                  </circle>
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    );
  };

  const renderServiceBand = (team: 'home' | 'away') => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const serverNum = lineup?.[0];
    const isServing = matchState.servingTeam === team;
    return (
      <div className="relative flex h-full items-center justify-center border-x border-white/15" style={{ background: serviceBg }}>
        <span className="rotate-180 [writing-mode:vertical-rl] text-xs md:text-sm font-black uppercase tracking-[0.35em] text-white/45">BATTUTA</span>
        <span className={`absolute top-2 text-[10px] font-black uppercase tracking-wider ${team === 'home' ? 'text-blue-200' : 'text-red-200'}`}>
          {team === 'home' ? homeTeam.name || 'CASA' : awayTeam.name || 'OSPITE'}
        </span>
        {isServing && serverNum != null && (
          <span className="absolute bottom-2 px-2 py-0.5 rounded-full bg-[hsl(var(--cs-cta))] text-white text-[10px] font-black shadow-md">
            #{serverNum} · Z1
          </span>
        )}
      </div>
    );
  };

  const LegendDot = ({ className, label }: { className: string; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <span className={`size-3 rounded-full ${className}`} /> {label}
    </span>
  );

  return (
    <div className="w-full">
      <div
        className="grid overflow-hidden rounded-lg border border-foreground/20 shadow-2xl"
        style={{
          aspectRatio: compactAspect ? '2 / 1' : '221 / 90',
          gridTemplateColumns: compactAspect
            ? '0.1fr 3fr 0.05fr 3fr 0.1fr'
            : '1.33fr 6fr 0.07fr 6fr 1.33fr',
        }}
      >
        {renderServiceBand('away')}
        {renderHalfCourt('away')}
        <div className="relative bg-muted">
          <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">NET</span>
        </div>
        {renderHalfCourt('home')}
        {renderServiceBand('home')}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <LegendDot className="bg-background ring-2 ring-warning" label="Palleggiatore S" />
        <LegendDot className="bg-yellow-700 border border-yellow-400" label="Libero" />
        <LegendDot className="bg-blue-700 border border-blue-300" label="Casa" />
        <LegendDot className="bg-red-700 border border-red-300" label="Ospite" />
      </div>
    </div>
  );
}
