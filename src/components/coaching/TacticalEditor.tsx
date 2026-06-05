import { useState, useRef, useCallback, useId } from 'react';
import type { TacticalDiagram, TacticalMarker, TacticalArrow, TacticalRole } from '@/types/tactical';
import { cn } from '@/lib/utils';

// ---------- Configurazione ruoli ----------

const ROLE_CONFIG: Record<TacticalRole, { label: string; color: string; bg: string }> = {
  setter:   { label: 'P',  color: '#ffffff', bg: '#1d4ed8' },
  opposite: { label: 'O',  color: '#ffffff', bg: '#7c3aed' },
  oh1:      { label: 'B1', color: '#111111', bg: '#f97316' },
  oh2:      { label: 'B2', color: '#111111', bg: '#f97316' },
  mb1:      { label: 'C1', color: '#ffffff', bg: '#6b7280' },
  mb2:      { label: 'C2', color: '#ffffff', bg: '#6b7280' },
  libero:   { label: 'L',  color: '#111111', bg: '#a78bfa' },
  ball:     { label: '⚽', color: '#111111', bg: '#fbbf24' },
  generic:  { label: 'X',  color: '#ffffff', bg: '#374151' },
};

const TOOLBAR_ROLES: TacticalRole[] = [
  'setter', 'opposite', 'oh1', 'oh2', 'mb1', 'mb2', 'libero', 'ball', 'generic',
];

const DEFAULT_POSITIONS: Record<TacticalRole, { x: number; y: number }> = {
  setter:   { x: 72, y: 22 },
  opposite: { x: 22, y: 22 },
  oh1:      { x: 22, y: 78 },
  oh2:      { x: 72, y: 78 },
  mb1:      { x: 22, y: 50 },
  mb2:      { x: 72, y: 50 },
  libero:   { x: 72, y: 50 },
  ball:     { x: 50, y: 10 },
  generic:  { x: 50, y: 50 },
};

interface TacticalEditorProps {
  value: TacticalDiagram;
  onChange: (d: TacticalDiagram) => void;
  readOnly?: boolean;
  height?: number;
}

export function TacticalEditor({
  value, onChange, readOnly = false, height = 240,
}: TacticalEditorProps) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [arrowMode, setArrowMode] = useState(false);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(2, Math.min(98, x)),
      y: Math.max(2, Math.min(98, y)),
    };
  }, []);

  const addMarker = (role: TacticalRole) => {
    if (readOnly) return;
    const pos = DEFAULT_POSITIONS[role];
    const existing = value.markers.filter(m => m.role === role).length;
    const newMarker: TacticalMarker = {
      id: `m-${uid}-${Date.now()}`,
      role,
      x: Math.min(96, pos.x + existing * 4),
      y: Math.min(96, pos.y + existing * 4),
    };
    onChange({ ...value, markers: [...value.markers, newMarker] });
    setSelectedId(newMarker.id);
  };

  const handleMarkerPointerDown = (e: React.PointerEvent, id: string) => {
    if (readOnly || arrowMode) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(id);
    setSelectedId(id);
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (readOnly) return;
    const pt = svgPoint(e.clientX, e.clientY);
    if (dragging) {
      onChange({
        ...value,
        markers: value.markers.map(m =>
          m.id === dragging ? { ...m, x: pt.x, y: pt.y } : m,
        ),
      });
    } else if (arrowMode && arrowStart) {
      setArrowPreview(pt);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (dragging) {
      setDragging(null);
      return;
    }
    if (arrowMode) {
      const pt = svgPoint(e.clientX, e.clientY);
      if (!arrowStart) {
        setArrowStart(pt);
      } else {
        const dist = Math.hypot(pt.x - arrowStart.x, pt.y - arrowStart.y);
        if (dist > 5) {
          const newArrow: TacticalArrow = {
            id: `a-${uid}-${Date.now()}`,
            fromX: arrowStart.x, fromY: arrowStart.y,
            toX: pt.x, toY: pt.y,
            style: 'solid',
            color: '#f97316',
          };
          onChange({ ...value, arrows: [...value.arrows, newArrow] });
        }
        setArrowStart(null);
        setArrowPreview(null);
      }
    }
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setSelectedId(null);
    }
  };

  const deleteSelected = () => {
    if (!selectedId || readOnly) return;
    onChange({
      markers: value.markers.filter(m => m.id !== selectedId),
      arrows: value.arrows.filter(a => a.id !== selectedId),
    });
    setSelectedId(null);
  };

  const toggleArrowStyle = (id: string) => {
    if (readOnly) return;
    onChange({
      ...value,
      arrows: value.arrows.map(a =>
        a.id === id ? { ...a, style: a.style === 'solid' ? 'dashed' : 'solid' } : a,
      ),
    });
  };

  const startEditLabel = (m: TacticalMarker) => {
    if (readOnly) return;
    setEditingLabel(m.id);
    setLabelInput(m.label ?? '');
  };

  const saveLabel = () => {
    if (!editingLabel) return;
    onChange({
      ...value,
      markers: value.markers.map(m =>
        m.id === editingLabel ? { ...m, label: labelInput.trim() || undefined } : m,
      ),
    });
    setEditingLabel(null);
  };

  const resetDiagram = () => {
    if (readOnly) return;
    onChange({ markers: [], arrows: [] });
    setSelectedId(null);
    setArrowStart(null);
    setArrowPreview(null);
  };

  const courtBg = 'hsl(28 70% 55%)';
  const lineColor = 'rgba(255,255,255,0.6)';
  const netColor = 'rgba(255,255,255,0.95)';
  const markerIdSafe = `arrowhead-${uid.replace(/:/g, '')}`;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-lg bg-secondary/40 border border-border">
          {TOOLBAR_ROLES.map(role => {
            const cfg = ROLE_CONFIG[role];
            return (
              <button
                key={role}
                type="button"
                onClick={() => addMarker(role)}
                title={`Aggiungi ${cfg.label}`}
                className="w-7 h-7 rounded-full border-2 border-border text-[10px] font-black
                           flex items-center justify-center transition-all hover:scale-110
                           active:scale-95 hover:border-white/60"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </button>
            );
          })}

          <div className="w-px h-6 bg-border mx-1" />

          <button
            type="button"
            onClick={() => {
              setArrowMode(!arrowMode);
              setArrowStart(null);
              setArrowPreview(null);
            }}
            title={arrowMode ? 'Esci modalità freccia' : 'Aggiungi freccia (clicca inizio → fine)'}
            className={cn(
              'px-2.5 h-7 rounded-lg border text-[10px] font-bold transition-all',
              arrowMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {arrowMode ? '✕ Freccia' : '→ Freccia'}
          </button>

          {selectedId && (
            <button
              type="button"
              onClick={deleteSelected}
              className="px-2.5 h-7 rounded-lg border border-destructive/50 bg-destructive/10
                         text-destructive text-[10px] font-bold hover:bg-destructive/20"
            >
              🗑 Elimina
            </button>
          )}

          {(value.markers.length > 0 || value.arrows.length > 0) && (
            <button
              type="button"
              onClick={resetDiagram}
              className="ml-auto px-2.5 h-7 rounded-lg border border-border bg-secondary
                         text-muted-foreground text-[10px] font-bold hover:text-foreground"
            >
              Reset campo
            </button>
          )}
        </div>
      )}

      {!readOnly && arrowMode && (
        <div className="text-[11px] text-primary px-2 py-1 rounded bg-primary/10 border border-primary/30">
          {arrowStart
            ? '🎯 Clicca il punto di arrivo della freccia'
            : '📍 Clicca il punto di partenza della freccia'}
        </div>
      )}

      <div
        className="relative rounded-lg overflow-hidden border border-border"
        style={{ height }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full touch-none select-none"
          style={{ background: courtBg, cursor: arrowMode ? 'crosshair' : 'default' }}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onClick={handleSvgClick}
        >
          <defs>
            <marker
              id={markerIdSafe}
              viewBox="0 0 10 10"
              refX="9" refY="5"
              markerWidth="5" markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#f97316" />
            </marker>
            <marker
              id={`${markerIdSafe}-preview`}
              viewBox="0 0 10 10"
              refX="9" refY="5"
              markerWidth="5" markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(249,115,22,0.6)" />
            </marker>
          </defs>

          {/* Bordi campo */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke={lineColor} strokeWidth="0.4" />
          {/* Rete (centro orizzontale) */}
          <line x1="2" y1="50" x2="98" y2="50" stroke={netColor} strokeWidth="0.8" strokeDasharray="2 1" />
          {/* Linee d'attacco a 3m */}
          <line x1="2" y1="33" x2="98" y2="33" stroke={lineColor} strokeWidth="0.3" />
          <line x1="2" y1="67" x2="98" y2="67" stroke={lineColor} strokeWidth="0.3" />

          {/* Etichette campo */}
          <text x="4" y="6" fontSize="2.5" fill="rgba(255,255,255,0.7)" fontWeight="bold">OSPITE</text>
          <text x="4" y="97" fontSize="2.5" fill="rgba(255,255,255,0.7)" fontWeight="bold">CASA</text>

          {/* Frecce */}
          {value.arrows.map(arrow => (
            <g
              key={arrow.id}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
              onClick={e => { e.stopPropagation(); if (!readOnly) setSelectedId(arrow.id); }}
              onDoubleClick={() => toggleArrowStyle(arrow.id)}
            >
              <line
                x1={arrow.fromX} y1={arrow.fromY}
                x2={arrow.toX} y2={arrow.toY}
                stroke={arrow.color}
                strokeWidth={selectedId === arrow.id ? 1.2 : 0.8}
                strokeDasharray={arrow.style === 'dashed' ? '2 1.5' : undefined}
                markerEnd={`url(#${markerIdSafe})`}
              />
              {selectedId === arrow.id && !readOnly && (
                <>
                  <circle cx={arrow.fromX} cy={arrow.fromY} r="1.5" fill="white" stroke={arrow.color} strokeWidth="0.4" />
                  <circle cx={arrow.toX} cy={arrow.toY} r="1.5" fill="white" stroke={arrow.color} strokeWidth="0.4" />
                </>
              )}
            </g>
          ))}

          {/* Preview freccia */}
          {arrowMode && arrowStart && arrowPreview && (
            <line
              x1={arrowStart.x} y1={arrowStart.y}
              x2={arrowPreview.x} y2={arrowPreview.y}
              stroke="rgba(249,115,22,0.6)"
              strokeWidth="0.8"
              strokeDasharray="1 1"
              markerEnd={`url(#${markerIdSafe}-preview)`}
            />
          )}
          {arrowMode && arrowStart && (
            <circle cx={arrowStart.x} cy={arrowStart.y} r="1.2" fill="#f97316" />
          )}

          {/* Marker */}
          {value.markers.map(marker => {
            const cfg = ROLE_CONFIG[marker.role];
            const isSelected = selectedId === marker.id;
            return (
              <g
                key={marker.id}
                style={{ cursor: readOnly ? 'default' : (dragging === marker.id ? 'grabbing' : 'grab') }}
                onPointerDown={e => handleMarkerPointerDown(e, marker.id)}
                onDoubleClick={() => startEditLabel(marker)}
              >
                {isSelected && (
                  <circle cx={marker.x} cy={marker.y} r="5.2" fill="none" stroke="#fff" strokeWidth="0.6" />
                )}
                <circle
                  cx={marker.x} cy={marker.y} r="4"
                  fill={cfg.bg}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="0.3"
                />
                <text
                  x={marker.x} y={marker.y + 1.3}
                  textAnchor="middle"
                  fontSize="3.2"
                  fontWeight="900"
                  fill={cfg.color}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {cfg.label}
                </text>
                {marker.label && (
                  <text
                    x={marker.x} y={marker.y + 7.5}
                    textAnchor="middle"
                    fontSize="2.4"
                    fill="white"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none', userSelect: 'none', paintOrder: 'stroke' }}
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth="0.4"
                  >
                    {marker.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Input label marker */}
      {editingLabel && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            placeholder="Etichetta marker (es. #10, ricezione)"
            className="flex-1 h-8 rounded-md border border-primary bg-secondary/60
                       px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={e => {
              if (e.key === 'Enter') saveLabel();
              if (e.key === 'Escape') setEditingLabel(null);
            }}
          />
          <button
            type="button"
            onClick={saveLabel}
            className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setEditingLabel(null)}
            className="px-3 h-8 rounded-md bg-secondary text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {!readOnly && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Clicca un bottone per aggiungere un giocatore · Trascina per spostare ·
          Doppio click per etichetta · → Freccia per movimenti ·
          Doppio click freccia per cambiare stile
        </p>
      )}
    </div>
  );
}
