import { useCallback, useId, useRef, useState } from 'react';
import { Plus, Trash2, ArrowRight, RotateCcw, X, LayoutGrid, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------- Tipi ----------

export type CourtMarkerKind =
  | 'player'   // Giocatore generico (numerato automaticamente)
  | 'coach'    // Allenatore
  | 'basket'   // Cesta palloni
  | 'cone'     // Cono
  | 'ball'     // Pallone
  | 'target';  // Bersaglio / zona

export interface CourtMarker {
  id: string;
  kind: CourtMarkerKind;
  x: number; // 0-100
  y: number; // 0-100
  label?: string;
}

export interface CourtArrow {
  id: string;
  fromX: number; fromY: number;
  toX: number;   toY: number;
  style: 'solid' | 'dashed';
}

export type CourtType = 'half' | 'full';

export interface CourtDiagram {
  id: string;
  type: CourtType;
  title?: string;
  markers: CourtMarker[];
  arrows: CourtArrow[];
}

// ---------- Config marker ----------

const MARKER_CFG: Record<CourtMarkerKind, { label: string; bg: string; fg: string; title: string }> = {
  player: { label: 'G', bg: '#f97316', fg: '#111', title: 'Giocatore' },
  coach:  { label: 'T', bg: '#1d4ed8', fg: '#fff', title: 'Allenatore' },
  basket: { label: '⬤', bg: '#111', fg: '#fbbf24', title: 'Cesta palloni' },
  cone:   { label: '▲', bg: '#dc2626', fg: '#fff', title: 'Cono' },
  ball:   { label: '⚽', bg: '#fbbf24', fg: '#111', title: 'Pallone' },
  target: { label: '✕', bg: '#7c3aed', fg: '#fff', title: 'Bersaglio' },
};

const TOOLBAR: CourtMarkerKind[] = ['player', 'coach', 'basket', 'cone', 'ball', 'target'];

// ---------- Utility ----------

export function emptyCourt(type: CourtType = 'half'): CourtDiagram {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    markers: [],
    arrows: [],
  };
}

// ---------- Editor singolo campo ----------

interface SingleCourtProps {
  value: CourtDiagram;
  onChange: (d: CourtDiagram) => void;
  onRemove: () => void;
  index: number;
}

function SingleCourt({ value, onChange, onRemove, index }: SingleCourtProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [arrowMode, setArrowMode] = useState(false);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null);

  const isFull = value.type === 'full';
  // Half: 9m x 9m (viewBox 100x100). Full: 18m x 9m (viewBox 100x50, aspect 2:1).
  const vbW = 100;
  const vbH = isFull ? 50 : 100;
  const aspect = isFull ? '2 / 1' : '1 / 1';
  const markerIdSafe = `exarrow-${uid.replace(/:/g, '')}`;

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * vbW;
    const y = ((clientY - rect.top) / rect.height) * vbH;
    return {
      x: Math.max(2, Math.min(vbW - 2, x)),
      y: Math.max(2, Math.min(vbH - 2, y)),
    };
  }, [vbW, vbH]);

  const addMarker = (kind: CourtMarkerKind) => {
    const nx = vbW / 2 + (Math.random() * 20 - 10);
    const ny = vbH / 2 + (Math.random() * 20 - 10);
    let label: string | undefined;
    if (kind === 'player') {
      const n = value.markers.filter(m => m.kind === 'player').length + 1;
      label = String(n);
    }
    onChange({
      ...value,
      markers: [...value.markers, { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, x: nx, y: ny, label }],
    });
  };

  const handleMarkerPointerDown = (e: React.PointerEvent, id: string) => {
    if (arrowMode) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(id);
    setSelectedId(id);
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    const pt = svgPoint(e.clientX, e.clientY);
    if (dragging) {
      onChange({
        ...value,
        markers: value.markers.map(m => m.id === dragging ? { ...m, x: pt.x, y: pt.y } : m),
      });
    } else if (arrowMode && arrowStart) {
      setArrowPreview(pt);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (dragging) { setDragging(null); return; }
    if (arrowMode) {
      const pt = svgPoint(e.clientX, e.clientY);
      if (!arrowStart) {
        setArrowStart(pt);
      } else {
        const dist = Math.hypot(pt.x - arrowStart.x, pt.y - arrowStart.y);
        if (dist > 3) {
          onChange({
            ...value,
            arrows: [...value.arrows, {
              id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              fromX: arrowStart.x, fromY: arrowStart.y,
              toX: pt.x, toY: pt.y,
              style: 'solid',
            }],
          });
        }
        setArrowStart(null);
        setArrowPreview(null);
      }
    }
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) setSelectedId(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    onChange({
      ...value,
      markers: value.markers.filter(m => m.id !== selectedId),
      arrows: value.arrows.filter(a => a.id !== selectedId),
    });
    setSelectedId(null);
  };

  const resetAll = () => {
    onChange({ ...value, markers: [], arrows: [] });
    setSelectedId(null); setArrowStart(null); setArrowPreview(null);
  };

  const toggleType = () => {
    onChange({ ...value, type: isFull ? 'half' : 'full', markers: [], arrows: [] });
    setSelectedId(null); setArrowStart(null); setArrowPreview(null);
  };

  // Colori campo (stessi del TacticalEditor per coerenza visiva)
  const courtBg = 'hsl(28 70% 55%)';
  const line = 'rgba(255,255,255,0.65)';
  const net = 'rgba(255,255,255,0.95)';

  // Ratio in metri: full ha una rete al centro dell'asse lungo, half è metà campo
  const netCoord = isFull ? { x1: 50, y1: 2, x2: 50, y2: vbH - 2 } : null;
  const attack1 = isFull
    ? { x1: 50 - 100 / 6, y1: 2, x2: 50 - 100 / 6, y2: vbH - 2 } // 3m dalla rete
    : { x1: 2, y1: vbH / 3, x2: vbW - 2, y2: vbH / 3 };          // linea 3m in metà campo
  const attack2 = isFull
    ? { x1: 50 + 100 / 6, y1: 2, x2: 50 + 100 / 6, y2: vbH - 2 }
    : null;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Campo {index + 1}
          </span>
          <button
            type="button"
            onClick={toggleType}
            className={cn(
              'h-7 px-2 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1',
              isFull
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
            )}
            title="Cambia tipo campo"
          >
            {isFull ? <LayoutGrid className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            {isFull ? 'Campo intero' : 'Metà campo'}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
        >
          <Trash2 className="w-3 h-3" /> Rimuovi
        </Button>
      </div>

      {/* Toolbar marker */}
      <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-lg bg-secondary/40 border border-border">
        {TOOLBAR.map(kind => {
          const cfg = MARKER_CFG[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => addMarker(kind)}
              title={`Aggiungi ${cfg.title}`}
              className="h-8 px-2 rounded-md border border-border text-[11px] font-bold
                         flex items-center gap-1.5 transition-all hover:scale-105
                         active:scale-95 hover:border-primary/50"
              style={{ background: 'hsl(var(--secondary))' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: cfg.bg, color: cfg.fg }}
              >
                {cfg.label}
              </span>
              <span className="hidden sm:inline">{cfg.title}</span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          onClick={() => { setArrowMode(!arrowMode); setArrowStart(null); setArrowPreview(null); }}
          className={cn(
            'h-8 px-2 rounded-md border text-[11px] font-bold transition-all flex items-center gap-1',
            arrowMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
          )}
          title={arrowMode ? 'Esci modalità freccia' : 'Aggiungi freccia'}
        >
          <ArrowRight className="w-3.5 h-3.5" />
          {arrowMode ? 'Esci' : 'Freccia'}
        </button>

        {selectedId && (
          <button
            type="button"
            onClick={deleteSelected}
            className="h-8 px-2 rounded-md border border-destructive/50 bg-destructive/10
                       text-destructive text-[11px] font-bold hover:bg-destructive/20 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Elimina
          </button>
        )}

        {(value.markers.length > 0 || value.arrows.length > 0) && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto h-8 px-2 rounded-md border border-border bg-secondary
                       text-muted-foreground text-[11px] font-bold hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {arrowMode && (
        <div className="text-[11px] text-primary px-2 py-1 rounded bg-primary/10 border border-primary/30">
          {arrowStart ? '🎯 Clicca il punto di arrivo' : '📍 Clicca il punto di partenza'}
        </div>
      )}

      {/* Campo */}
      <div
        className="relative rounded-lg overflow-hidden border border-border w-full"
        style={{ aspectRatio: aspect }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="none"
          className="w-full h-full touch-none select-none"
          style={{ background: courtBg, cursor: arrowMode ? 'crosshair' : 'default' }}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onClick={handleSvgClick}
        >
          <defs>
            <marker id={markerIdSafe} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#f97316" />
            </marker>
            <marker id={`${markerIdSafe}-preview`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(249,115,22,0.6)" />
            </marker>
          </defs>

          {/* Bordi campo */}
          <rect x="2" y="2" width={vbW - 4} height={vbH - 4} fill="none" stroke={line} strokeWidth={isFull ? 0.4 : 0.5} />

          {/* Rete (solo full) */}
          {netCoord && (
            <line {...netCoord} stroke={net} strokeWidth="0.8" strokeDasharray="2 1" />
          )}

          {/* Linee 3m */}
          {attack1 && <line {...attack1} stroke={line} strokeWidth="0.3" />}
          {attack2 && <line {...attack2} stroke={line} strokeWidth="0.3" />}

          {/* Frecce */}
          {value.arrows.map(a => (
            <g
              key={a.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setSelectedId(a.id); }}
              onDoubleClick={() => onChange({
                ...value,
                arrows: value.arrows.map(x => x.id === a.id ? { ...x, style: x.style === 'solid' ? 'dashed' : 'solid' } : x),
              })}
            >
              <line
                x1={a.fromX} y1={a.fromY} x2={a.toX} y2={a.toY}
                stroke="#f97316"
                strokeWidth={selectedId === a.id ? (isFull ? 0.9 : 1.2) : (isFull ? 0.6 : 0.8)}
                strokeDasharray={a.style === 'dashed' ? '2 1.5' : undefined}
                markerEnd={`url(#${markerIdSafe})`}
              />
              {selectedId === a.id && (
                <>
                  <circle cx={a.fromX} cy={a.fromY} r={isFull ? 1.1 : 1.5} fill="white" stroke="#f97316" strokeWidth="0.4" />
                  <circle cx={a.toX} cy={a.toY} r={isFull ? 1.1 : 1.5} fill="white" stroke="#f97316" strokeWidth="0.4" />
                </>
              )}
            </g>
          ))}

          {arrowMode && arrowStart && arrowPreview && (
            <line
              x1={arrowStart.x} y1={arrowStart.y} x2={arrowPreview.x} y2={arrowPreview.y}
              stroke="rgba(249,115,22,0.6)" strokeWidth={isFull ? 0.6 : 0.8}
              strokeDasharray="1 1"
              markerEnd={`url(#${markerIdSafe}-preview)`}
            />
          )}
          {arrowMode && arrowStart && (
            <circle cx={arrowStart.x} cy={arrowStart.y} r={isFull ? 0.9 : 1.2} fill="#f97316" />
          )}

          {/* Marker */}
          {value.markers.map(m => {
            const cfg = MARKER_CFG[m.kind];
            const isSelected = selectedId === m.id;
            const r = isFull ? 2.6 : 4;
            const fontSize = isFull ? 2.2 : 3.2;
            return (
              <g
                key={m.id}
                style={{ cursor: dragging === m.id ? 'grabbing' : 'grab' }}
                onPointerDown={e => handleMarkerPointerDown(e, m.id)}
              >
                {isSelected && (
                  <circle cx={m.x} cy={m.y} r={r + 1.2} fill="none" stroke="#fff" strokeWidth="0.5" />
                )}
                <circle cx={m.x} cy={m.y} r={r} fill={cfg.bg} stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />
                <text
                  x={m.x} y={m.y + fontSize * 0.4}
                  textAnchor="middle" fontSize={fontSize} fontWeight="900"
                  fill={cfg.fg}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {m.label ?? cfg.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Clicca un pulsante per aggiungere · Trascina per spostare · Freccia per movimenti · Doppio click sulla freccia per stile
      </p>
    </div>
  );
}

// ---------- Editor multi-campo (esportato) ----------

interface Props {
  value: CourtDiagram[];
  onChange: (courts: CourtDiagram[]) => void;
}

export function ExerciseCourtEditor({ value, onChange }: Props) {
  const addCourt = (type: CourtType) => onChange([...value, emptyCourt(type)]);
  const updateCourt = (id: string, d: CourtDiagram) =>
    onChange(value.map(c => c.id === id ? d : c));
  const removeCourt = (id: string) =>
    onChange(value.filter(c => c.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {value.length === 0
            ? 'Nessun campo. Aggiungi un campo per iniziare a disegnare l\'esercizio.'
            : `${value.length} campo${value.length > 1 ? 'i' : ''} disegnato${value.length > 1 ? 'i' : ''}.`}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addCourt('half')} className="gap-1 h-8">
            <Plus className="w-3.5 h-3.5" /> <Square className="w-3.5 h-3.5" /> Metà campo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addCourt('full')} className="gap-1 h-8">
            <Plus className="w-3.5 h-3.5" /> <LayoutGrid className="w-3.5 h-3.5" /> Campo intero
          </Button>
        </div>
      </div>

      {value.map((c, i) => (
        <SingleCourt
          key={c.id}
          value={c}
          index={i}
          onChange={d => updateCourt(c.id, d)}
          onRemove={() => removeCourt(c.id)}
        />
      ))}
    </div>
  );
}

// ---------- Preview read-only per le card ----------

export function CourtDiagramPreview({ court, className }: { court: CourtDiagram; className?: string }) {
  const isFull = court.type === 'full';
  const vbW = 100;
  const vbH = isFull ? 50 : 100;
  const line = 'rgba(255,255,255,0.65)';
  const net = 'rgba(255,255,255,0.95)';
  const courtBg = 'hsl(28 70% 55%)';

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      className={cn('rounded border border-border w-full', className)}
      style={{ background: courtBg, aspectRatio: isFull ? '2 / 1' : '1 / 1' }}
    >
      <rect x="2" y="2" width={vbW - 4} height={vbH - 4} fill="none" stroke={line} strokeWidth={isFull ? 0.5 : 0.6} />
      {isFull && <line x1="50" y1="2" x2="50" y2={vbH - 2} stroke={net} strokeWidth="0.8" strokeDasharray="2 1" />}
      {isFull ? (
        <>
          <line x1={50 - 100 / 6} y1="2" x2={50 - 100 / 6} y2={vbH - 2} stroke={line} strokeWidth="0.3" />
          <line x1={50 + 100 / 6} y1="2" x2={50 + 100 / 6} y2={vbH - 2} stroke={line} strokeWidth="0.3" />
        </>
      ) : (
        <line x1="2" y1={vbH / 3} x2={vbW - 2} y2={vbH / 3} stroke={line} strokeWidth="0.3" />
      )}
      {court.arrows.map(a => (
        <line
          key={a.id}
          x1={a.fromX} y1={a.fromY} x2={a.toX} y2={a.toY}
          stroke="#f97316" strokeWidth={isFull ? 0.6 : 0.8}
          strokeDasharray={a.style === 'dashed' ? '2 1.5' : undefined}
        />
      ))}
      {court.markers.map(m => {
        const cfg = MARKER_CFG[m.kind];
        const r = isFull ? 2.4 : 3.4;
        const fs = isFull ? 2 : 2.8;
        return (
          <g key={m.id}>
            <circle cx={m.x} cy={m.y} r={r} fill={cfg.bg} stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />
            <text x={m.x} y={m.y + fs * 0.4} textAnchor="middle" fontSize={fs} fontWeight="900" fill={cfg.fg}>
              {m.label ?? cfg.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
