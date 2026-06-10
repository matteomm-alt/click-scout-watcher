import { useEffect, useRef, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { getReceptionPositions, getAttackPositions } from '@/lib/receptionFormations';
import { getPhaseLayout, getInitialPhases } from '@/lib/tacticalPhases';
import { getPhasePositionOverride } from '@/lib/courtPositionResolver';

/* ------------------------------------------------------------------ */
/* Legacy ZoneCourt (manteniamo l'export per retro-compatibilità)      */
/* ------------------------------------------------------------------ */
interface ZoneCourtProps {
  onZoneClick?: (zone: number) => void;
  startZone?: number | null;
  endZone?: number | null;
  mode?: 'display' | 'select-start' | 'select-end';
  side?: 'home' | 'away';
  skill?: string | null;
  large?: boolean;
  suggestedZone?: number;
}

const ZONES = [
  { zone: 4, col: 0, row: 0, label: 'Palla alta sx' },
  { zone: 3, col: 1, row: 0, label: 'Primo tempo' },
  { zone: 2, col: 2, row: 0, label: 'Palla alta dx' },
  { zone: 5, col: 0, row: 1, label: 'Back sx' },
  { zone: 6, col: 1, row: 1, label: 'Pipe' },
  { zone: 1, col: 2, row: 1, label: 'Back dx' },
  { zone: 7, col: 0, row: 2, label: 'Fondo sx' },
  { zone: 8, col: 1, row: 2, label: 'Fondo cent.' },
  { zone: 9, col: 2, row: 2, label: 'Fondo dx' },
];

export function ZoneCourt({ onZoneClick, startZone, endZone, mode = 'display', large }: ZoneCourtProps) {
  const selectable = mode !== 'display';
  return (
    <div className={`grid grid-cols-3 gap-0.5 ${large ? 'aspect-square' : 'aspect-[3/2]'} bg-orange-900/30 p-1 rounded-lg`}>
      {ZONES.map((z) => {
        const active = startZone === z.zone || endZone === z.zone;
        return (
          <button
            type="button"
            key={z.zone}
            disabled={!selectable}
            onClick={() => selectable && onZoneClick?.(z.zone)}
            className={`relative flex items-center justify-center text-[10px] uppercase tracking-wider font-bold transition-colors min-h-[48px] ${
              active ? 'bg-primary text-primary-foreground' : 'bg-orange-700/40 text-white/90 hover:bg-orange-600/50'
            }`}
          >
            <span className="absolute top-1 left-1 text-[10px] font-black opacity-80">{z.zone}</span>
            <span className="px-1 text-center leading-tight">{z.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nuovo VolleyballCourt — campo interattivo "click diretto"           */
/* ------------------------------------------------------------------ */
type LiveArrow = { startZone: number; endZone: number; evaluation: string };

interface VolleyballCourtProps {
  heatmapData?: Record<number, number>;
  liveArrows?: LiveArrow[];
  receptionMode?: { home?: boolean; away?: boolean };
  highlightTeam?: 'home' | 'away' | null;
  highlightPlayerNumber?: number | null;
  simplifiedView?: boolean;

  /** Click sul cerchio giocatrice → bottom sheet */
  onPlayerClick?: (playerNumber: number, team: 'home' | 'away') => void;
  /** Giocatrice attualmente selezionata (ring pulsante) */
  selectedPlayer?: { number: number; team: 'home' | 'away' } | null;
  /** Giocatrice che ha appena completato un'azione (flash verde ~700ms) */
  recentActionPlayer?: { number: number; team: 'home' | 'away'; evaluation?: string } | null;

  /** Overlay zone cliccabili sopra al campo (per step zona post-azione) */
  selectedZone?: number | null;
  onZoneClick?: (zone: number, team: 'home' | 'away') => void;
  /** Squadra su cui mostrare l'overlay zone (default: entrambe) */
  zoneSelectTeam?: 'home' | 'away';
  /** Skill in corso di selezione zona (per banner contestuale) */
  zoneSelectSkill?: string | null;

  /** Layout: 'split' (default) due campi affiancati, 'single' un unico campo */
  layout?: 'split' | 'single';
}

// Coordinate posizioni P1..P6 (in %) per ciascun half-court
const POS_AWAY: Record<number, { x: number; y: number }> = {
  2: { x: 78, y: 78 }, 3: { x: 78, y: 50 }, 4: { x: 78, y: 22 },
  1: { x: 28, y: 78 }, 6: { x: 28, y: 50 }, 5: { x: 28, y: 22 },
};
const POS_HOME: Record<number, { x: number; y: number }> = {
  2: { x: 22, y: 22 }, 3: { x: 22, y: 50 }, 4: { x: 22, y: 78 },
  1: { x: 72, y: 22 }, 6: { x: 72, y: 50 }, 5: { x: 72, y: 78 },
};

// Centri zone (per heatmap e overlay)
const ZONE_CENTERS_AWAY: { zone: number; x: number; y: number }[] = [
  { zone: 4, x: 78, y: 22 }, { zone: 3, x: 78, y: 50 }, { zone: 2, x: 78, y: 78 },
  { zone: 5, x: 28, y: 22 }, { zone: 6, x: 28, y: 50 }, { zone: 1, x: 28, y: 78 },
  { zone: 7, x: 6,  y: 22 }, { zone: 8, x: 6,  y: 50 }, { zone: 9, x: 6,  y: 78 },
];
const ZONE_CENTERS_HOME: { zone: number; x: number; y: number }[] = [
  { zone: 4, x: 22, y: 78 }, { zone: 3, x: 22, y: 50 }, { zone: 2, x: 22, y: 22 },
  { zone: 5, x: 72, y: 78 }, { zone: 6, x: 72, y: 50 }, { zone: 1, x: 72, y: 22 },
  { zone: 7, x: 94, y: 78 }, { zone: 8, x: 94, y: 50 }, { zone: 9, x: 94, y: 22 },
];

// Determina il ruolo "logico" di uno slot in base alla posizione del setter (schema 5-1).
// Setter @P1 → slot offsets: P1=Setter, P2=Middle, P3=Outside, P4=Opposite, P5=Middle, P6=Outside
type LogicalRole = 'setter' | 'opposite' | 'middle' | 'outside';
function logicalRoleForSlot(slotPos: number, setterPos: number): LogicalRole {
  const offset = ((slotPos - setterPos + 6) % 6);
  if (offset === 0) return 'setter';
  if (offset === 3) return 'opposite';
  if (offset === 1 || offset === 4) return 'middle';
  return 'outside';
}

const courtBg = 'hsl(28 70% 55%)';

export function VolleyballCourt({
  heatmapData,
  liveArrows,
  receptionMode,
  highlightTeam,
  highlightPlayerNumber,
  simplifiedView = false,
  onPlayerClick,
  selectedPlayer,
  recentActionPlayer,
  selectedZone,
  onZoneClick,
  zoneSelectTeam,
  zoneSelectSkill,
  layout = 'split',
}: VolleyballCourtProps = {}) {
  const { matchState, homeTeam, awayTeam, homeReceptionFormations, awayReceptionFormations, homeAttackFormations, awayAttackFormations } = useMatchStore();
  const teamTacticalPhases = matchState.teamTacticalPhases ?? getInitialPhases(matchState.servingTeam);

  // Pulsante server per 3s al cambio di servizio
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
      : { number: num, name: `#${num}`, role: undefined as undefined, isLibero: false };
  };

  const renderHalf = (team: 'home' | 'away') => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const setterPosition = team === 'home' ? matchState.homeSetterPosition : matchState.awaySetterPosition;
    const recFormations = team === 'home' ? homeReceptionFormations : awayReceptionFormations;
    const atkFormations = team === 'home'
      ? (homeAttackFormations ?? homeReceptionFormations)
      : (awayAttackFormations ?? awayReceptionFormations);

    const phase = team === 'home' ? teamTacticalPhases.home : teamTacticalPhases.away;
    const phaseLayout = getPhaseLayout(phase);

    let overridePositions: ReturnType<typeof getReceptionPositions> | null = null;
    if (phaseLayout === 'reception') {
      overridePositions = getReceptionPositions(recFormations, setterPosition, team === 'home');
    } else if (phaseLayout === 'attack') {
      overridePositions = getAttackPositions(atkFormations, setterPosition, team === 'home');
    }
    // 'defense' e 'normal' → nessun override (rotazione standard)

    const isReceiving = team === 'home' ? !!receptionMode?.home : !!receptionMode?.away;

    const zoneCenters = team === 'home' ? ZONE_CENTERS_HOME : ZONE_CENTERS_AWAY;
    const showZoneOverlay = !!onZoneClick && (!zoneSelectTeam || zoneSelectTeam === team);
    const zoneClickEnabled = showZoneOverlay;

    const showHeatmap = heatmapData && team === 'away';
    const maxHeat = heatmapData ? Math.max(...Object.values(heatmapData), 1) : 1;

    return (
      <div
        className="relative h-full overflow-hidden rounded-md"
        style={{ background: courtBg, boxShadow: 'inset 0 0 60px rgba(0,0,0,0.22)' }}
      >
        {/* Linee campo */}
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

        {/* Heatmap */}
        {showHeatmap && zoneCenters.map((z) => {
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

        {/* Banner contestuale zona */}
        {showZoneOverlay && zoneSelectSkill && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider shadow-lg">
            {zoneSelectSkill === 'A' ? 'Dove è caduta?' :
             zoneSelectSkill === 'S' ? 'Zona battuta' :
             zoneSelectSkill === 'R' ? 'Da dove è arrivata?' :
             'Seleziona zona'}
          </div>
        )}

        {/* Zone overlay cliccabili (post-azione) */}
        {showZoneOverlay && zoneCenters.map((z) => {
          const active = selectedZone === z.zone;
          return (
            <button
              type="button"
              key={`zone-${team}-${z.zone}`}
              onClick={() => zoneClickEnabled && onZoneClick?.(z.zone, team)}
              className={`absolute z-[15] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 transition-all active:scale-95 ${
                active
                  ? 'bg-primary/60 border-primary ring-2 ring-primary'
                  : 'bg-black/30 border-white/40 hover:bg-white/15'
              }`}
              style={{ left: `${z.x}%`, top: `${z.y}%`, width: '26%', height: '26%' }}
              aria-label={`Zona ${z.zone}`}
            >
              <span className="text-white font-black text-base drop-shadow">{z.zone}</span>
            </button>
          );
        })}

        {/* Etichetta ricezione */}
        {isReceiving && !simplifiedView && (
          <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full bg-accent/90 text-[9px] font-black uppercase tracking-wider text-accent-foreground shadow-md">
            Ricezione · S{setterPosition}
          </span>
        )}

        {/* Giocatrici */}
        {[1, 2, 3, 4, 5, 6].map((pos) => {
          const playerNum = lineup[pos - 1];
          if (!playerNum) return null;
          const info = getPlayerInfo(playerNum, team);
          const basePos = team === 'home' ? POS_HOME[pos] : POS_AWAY[pos];
          const formationPos = overridePositions?.[pos as 1|2|3|4|5|6] ?? null;
          const phaseOverride = getPhasePositionOverride(phase, pos, setterPosition, team === 'home');
          const p = phaseOverride ?? formationPos ?? basePos;

          const logRole = logicalRoleForSlot(pos, setterPosition);
          const isSetter = logRole === 'setter';
          const isOpposite = logRole === 'opposite';
          const isLibero = Boolean(info.isLibero || info.role === 'L');
          const isServer = pos === 1 && matchState.servingTeam === team;
          const isSelected = selectedPlayer?.number === playerNum && selectedPlayer.team === team;
          const isHighlighted = highlightTeam === team && highlightPlayerNumber === playerNum;
          const isRecent = recentActionPlayer?.number === playerNum && recentActionPlayer.team === team;
          const recentEval = recentActionPlayer?.evaluation;
          const recentColor =
            recentEval === '#' ? 'ring-emerald-400'
            : recentEval === '=' ? 'ring-red-500'
            : recentEval === '/' ? 'ring-amber-400'
            : 'ring-primary';

          // Colori per ruolo
          let colorCls: string;
          if (isLibero) {
            colorCls = 'bg-violet-400 border-violet-200 text-slate-900';
          } else if (isSetter) {
            colorCls = 'bg-blue-700 border-blue-300 text-white';
          } else if (isOpposite) {
            colorCls = 'bg-violet-700 border-violet-300 text-white';
          } else if (logRole === 'middle') {
            colorCls = 'bg-slate-100 border-slate-400 text-slate-900';
          } else {
            colorCls = 'bg-white border-slate-400 text-slate-900';
          }

          const ringCls = [
            isServer && serverPulseActive ? 'ring-4 ring-cyan-300 animate-pulse' : '',
            isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent animate-pulse' : '',
            isHighlighted ? 'ring-4 ring-primary' : '',
            isRecent ? `ring-4 ${recentColor} animate-ping-once` : '',
          ].filter(Boolean).join(' ');

          const clickable = !!onPlayerClick;
          return (
            <div
              key={`${team}-p-${pos}`}
              className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-300 ease-out"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onPlayerClick?.(playerNum, team)}
                className={`relative flex size-12 md:size-14 items-center justify-center rounded-full text-base md:text-lg font-black border-2 shadow-[0_2px_8px_rgba(0,0,0,0.7)] ${colorCls} ${ringCls} ${clickable ? 'cursor-pointer active:scale-95 transition-transform hover:brightness-110' : 'cursor-default'}`}
                aria-label={`Giocatrice ${info.number}`}
              >
                {info.number}
                {isSetter && (
                  <span className="absolute -right-1.5 -bottom-1.5 rounded bg-blue-900 px-1.5 py-0.5 text-[10px] font-black text-white border border-white/40">S</span>
                )}
                {isLibero && (
                  <span className="absolute -right-1.5 -bottom-1.5 rounded bg-violet-900 px-1.5 py-0.5 text-[10px] font-black text-white border border-white/40">L</span>
                )}
              </button>
              {!simplifiedView && (
                <span className="mt-0.5 max-w-16 truncate text-[11px] font-bold text-white/95 drop-shadow">{info.name}</span>
              )}
            </div>
          );
        })}

        {/* Live arrows (solo home, ultimi 5) */}
        {liveArrows && liveArrows.length > 0 && team === 'home' && !simplifiedView && (
          <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrow-live" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
              </marker>
            </defs>
            {liveArrows.slice(-5).map((arr, i, arrs) => {
              const from = zoneCenters.find((z) => z.zone === arr.startZone);
              const to = zoneCenters.find((z) => z.zone === arr.endZone);
              if (!from || !to || arr.startZone === arr.endZone) return null;
              const opacity = 0.2 + (i / Math.max(1, arrs.length - 1)) * 0.75;
              const color = arr.evaluation === '#' ? '#16a34a' : arr.evaluation === '=' ? '#dc2626' : '#ca8a04';
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={color} strokeWidth="0.9" strokeLinecap="round"
                  strokeDasharray="2 1" opacity={opacity}
                  markerEnd="url(#arrow-live)"
                  vectorEffect="non-scaling-stroke" />
              );
            })}
          </svg>
        )}
      </div>
    );
  };

  if (layout === 'single') {
    return (
      <div className="w-full h-full">
        {renderHalf('home')}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex gap-2 items-stretch">
      <div className="flex-1 min-w-0 relative">
        <span className="absolute -top-4 left-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {awayTeam.name || 'Ospite'}
        </span>
        {renderHalf('away')}
      </div>
      <div className="w-1 self-stretch bg-white/70 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]" aria-hidden />
      <div className="flex-1 min-w-0 relative">
        <span className="absolute -top-4 left-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {homeTeam.name || 'Casa'}
        </span>
        {renderHalf('home')}
      </div>
    </div>
  );
}
