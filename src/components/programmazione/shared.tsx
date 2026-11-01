import { useState } from 'react';
import {
  Plus, GripVertical, X, } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

import { safeUUID } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface Plan {
  id: string;
  name: string;
  season: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export interface TextPoint { id: string; testo: string; }
export interface AtletaBlock {
  id: string;
  atleta_id: string;
  atleta_nome: string;
  ruolo: string;
  punti: TextPoint[];
}
export interface GridBlock { id: string; fundamental: string; note?: string; }
export type GridData = Record<string, Record<string, GridBlock[]>>;

export interface Phase {
  id: string;
  plan_id: string;
  name: string;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  goals: string | null;
  load_level: string | null;
  lavoro_tecnico: TextPoint[];
  lavoro_tattico: TextPoint[];
  tecnica_individuale: AtletaBlock[];
  grid_data: GridData;
}

export interface Athlete {
  id: string; first_name: string | null; last_name: string; role: string | null;
}
export interface SkeletonRow { id: string; name: string; schedule: unknown; blocks?: { settimane?: unknown[] } | null; }

export interface FondColor { sfondo: string; testo: string; }
export interface CustomFond { id: string; nome: string; colore_sfondo: string; colore_testo: string; }

/* ------------------------------------------------------------------ */
/* Fondamentali (predefiniti + custom + colori)                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_FONDAMENTALI: Record<string, FondColor> = {
  Ricezione:    { sfondo: '#dbeafe', testo: '#1d4ed8' },
  Attacco:      { sfondo: '#fce7f3', testo: '#be185d' },
  Battuta:      { sfondo: '#d1fae5', testo: '#065f46' },
  Muro:         { sfondo: '#ede9fe', testo: '#5b21b6' },
  Difesa:       { sfondo: '#fef3c7', testo: '#92400e' },
  Alzata:       { sfondo: '#ffedd5', testo: '#c2410c' },
  Bagher:       { sfondo: '#e0f2fe', testo: '#0369a1' },
  Palleggio:    { sfondo: '#ecfccb', testo: '#3f6212' },
  Fisico:       { sfondo: '#cffafe', testo: '#155e75' },
  Tattica:      { sfondo: '#e0e7ff', testo: '#3730a3' },
  'Gioco libero': { sfondo: '#fae8ff', testo: '#86198f' },
  Situazionale: { sfondo: '#f0fdf4', testo: '#166534' },
  Partita:      { sfondo: '#fee2e2', testo: '#991b1b' },
  Riposo:       { sfondo: '#1c1c1f', testo: '#a1a1aa' },
};

export const LS_CUSTOM = 'prog_fondamentali_custom_v1';
export const LS_COLORS = 'prog_fondamentali_colors_v1';

export function safeGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}
export function safeSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function fmtDate(d: Date) {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
export function weeksInPhase(ph: Phase): number {
  if (!ph.start_date || !ph.end_date) return 4;
  const s = startOfWeek(new Date(ph.start_date));
  const e = new Date(ph.end_date);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (7 * 86400000)) + 1);
}
export function isNowInside(ph: Phase): boolean {
  if (!ph.start_date || !ph.end_date) return false;
  const now = new Date();
  return now >= new Date(ph.start_date) && now <= new Date(ph.end_date);
}
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('');
}

/* ------------------------------------------------------------------ */
/* Sortable point row                                                 */
/* ------------------------------------------------------------------ */

export function SortablePoint({
  point, onChange, onRemove,
}: { point: TextPoint; onChange: (v: string) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 py-1">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Riordina"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Textarea
        value={point.testo}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className="flex-1 min-h-[36px] resize-y"
        placeholder="Scrivi qui..."
      />
      <Button size="icon" variant="ghost" onClick={onRemove} className="mt-1 h-8 w-8">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function PointsSection({
  title, items, onChange,
}: { title: string; items: TextPoint[]; onChange: (next: TextPoint[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
        <Button
          size="sm" variant="outline"
          onClick={() => onChange([...items, { id: safeUUID(), testo: '' }])}
        >
          <Plus className="w-3 h-3 mr-1" /> Punto
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (over && active.id !== over.id) {
            const oldI = items.findIndex(x => x.id === active.id);
            const newI = items.findIndex(x => x.id === over.id);
            if (oldI !== -1 && newI !== -1) onChange(arrayMove(items, oldI, newI));
          }
        }}
      >
        <SortableContext items={items.map(x => x.id)} strategy={verticalListSortingStrategy}>
          {items.map((p, i) => (
            <SortablePoint
              key={p.id}
              point={p}
              onChange={(v) => {
                const next = items.slice(); next[i] = { ...p, testo: v }; onChange(next);
              }}
              onRemove={() => onChange(items.filter(x => x.id !== p.id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded">
          Nessun punto. Clicca "Punto" per aggiungere.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sortable macrociclo card                                           */
/* ------------------------------------------------------------------ */

export function SortableMacroCard({
  ph, active, onClick,
}: { ph: Phase; active: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ph.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const weeks = weeksInPhase(ph);
  const width = Math.min(100, weeks * 6);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-3 bg-card cursor-pointer transition-colors ${active ? 'border-primary ring-1 ring-primary/40' : 'border-border hover:border-primary/40'}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Riordina macrociclo"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <p className="font-bold text-sm truncate flex-1">{ph.name}</p>
        {isNowInside(ph) && (
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            in corso
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {weeks} sett. · {ph.start_date ?? '—'} → {ph.end_date ?? '—'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fundamental select with custom option                              */
/* ------------------------------------------------------------------ */

export function FundamentalSelect({
  value, onChange, allFundamentals, onAddCustom,
}: {
  value: string;
  onChange: (v: string) => void;
  allFundamentals: string[];
  onAddCustom: (name: string, bg: string, fg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [bg, setBg] = useState('#e0f2fe');
  const [fg, setFg] = useState('#0369a1');
  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(v) => {
        if (v === '__new__') { setShowForm(true); return; }
        onChange(v);
      }}>
        <SelectTrigger><SelectValue placeholder="Fondamentale" /></SelectTrigger>
        <SelectContent>
          {allFundamentals.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          <SelectItem value="__new__" className="text-primary font-semibold">
            + Nuovo fondamentale...
          </SelectItem>
        </SelectContent>
      </Select>
      {showForm && (
        <div className="p-2 rounded border border-border space-y-2 bg-muted/30">
          <Input placeholder="Nome fondamentale" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center gap-2">
            <label className="text-xs">Sfondo</label>
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            <label className="text-xs">Testo</label>
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              if (!name.trim()) { toast.error('Nome obbligatorio'); return; }
              onAddCustom(name.trim(), bg, fg);
              onChange(name.trim());
              setShowForm(false); setName('');
            }}>Aggiungi</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
