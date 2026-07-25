import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutGrid, Plus, Trash2, GripVertical, ChevronLeft, ChevronRight,
  Download, Printer, Pencil, RotateCcw, X, ArrowRight, Copy,
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { safeUUID } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const Periodizzazione = lazy(() => import('./Periodizzazione'));

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  name: string;
  season: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

interface TextPoint { id: string; testo: string; }
interface AtletaBlock {
  id: string;
  atleta_id: string;
  atleta_nome: string;
  ruolo: string;
  punti: TextPoint[];
}
interface GridBlock { id: string; fundamental: string; note?: string; }
type GridData = Record<string, Record<string, GridBlock[]>>;

interface Phase {
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

interface Athlete {
  id: string; first_name: string | null; last_name: string; role: string | null;
}
interface SkeletonRow { id: string; name: string; schedule: unknown; }

interface FondColor { sfondo: string; testo: string; }
interface CustomFond { id: string; nome: string; colore_sfondo: string; colore_testo: string; }

/* ------------------------------------------------------------------ */
/* Fondamentali (predefiniti + custom + colori)                        */
/* ------------------------------------------------------------------ */

const DEFAULT_FONDAMENTALI: Record<string, FondColor> = {
  Ricezione:    { sfondo: '#dbeafe', testo: '#1d4ed8' },
  Attacco:      { sfondo: '#fce7f3', testo: '#be185d' },
  Battuta:      { sfondo: '#d1fae5', testo: '#065f46' },
  Muro:         { sfondo: '#ede9fe', testo: '#5b21b6' },
  Difesa:       { sfondo: '#fef3c7', testo: '#92400e' },
  Alzata:       { sfondo: '#ffedd5', testo: '#c2410c' },
  Bagher:       { sfondo: '#e0f2fe', testo: '#0369a1' },
  Situazionale: { sfondo: '#f0fdf4', testo: '#166534' },
  Partita:      { sfondo: '#fee2e2', testo: '#991b1b' },
  Riposo:       { sfondo: '#1c1c1f', testo: '#a1a1aa' },
};

const LS_CUSTOM = 'prog_fondamentali_custom_v1';
const LS_COLORS = 'prog_fondamentali_colors_v1';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}
function safeSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(d: Date) {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
function weeksInPhase(ph: Phase): number {
  if (!ph.start_date || !ph.end_date) return 4;
  const s = startOfWeek(new Date(ph.start_date));
  const e = new Date(ph.end_date);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (7 * 86400000)) + 1);
}
function isNowInside(ph: Phase): boolean {
  if (!ph.start_date || !ph.end_date) return false;
  const now = new Date();
  return now >= new Date(ph.start_date) && now <= new Date(ph.end_date);
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('');
}

/* ------------------------------------------------------------------ */
/* Sortable point row                                                 */
/* ------------------------------------------------------------------ */

function SortablePoint({
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

function PointsSection({
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

function SortableMacroCard({
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
          <span className="text-[9px] font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            in corso
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {weeks} sett. · {ph.start_date ?? '—'} → {ph.end_date ?? '—'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fundamental select with custom option                              */
/* ------------------------------------------------------------------ */

function FundamentalSelect({
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

/* ------------------------------------------------------------------ */
/* Main page                                                          */
/* ------------------------------------------------------------------ */

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function ProgrammazioneStagionale() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [skeletons, setSkeletons] = useState<SkeletonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('macrocicli');
  const [gridPhaseId, setGridPhaseId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Custom + colors
  const [custom, setCustom] = useState<CustomFond[]>(() => safeGet<CustomFond[]>(LS_CUSTOM, []));
  const [colorsOverride, setColorsOverride] = useState<Record<string, FondColor>>(
    () => safeGet<Record<string, FondColor>>(LS_COLORS, {}),
  );

  useEffect(() => safeSet(LS_CUSTOM, custom), [custom]);
  useEffect(() => safeSet(LS_COLORS, colorsOverride), [colorsOverride]);

  const allFundamentals = useMemo(
    () => [...Object.keys(DEFAULT_FONDAMENTALI), ...custom.map(c => c.nome)],
    [custom],
  );
  const colorFor = useCallback((name: string): FondColor => {
    if (colorsOverride[name]) return colorsOverride[name];
    if (DEFAULT_FONDAMENTALI[name]) return DEFAULT_FONDAMENTALI[name];
    const c = custom.find(x => x.nome === name);
    if (c) return { sfondo: c.colore_sfondo, testo: c.colore_testo };
    return { sfondo: '#1c1c1f', testo: '#e5e5e5' };
  }, [colorsOverride, custom]);

  /* Load plans */
  useEffect(() => {
    if (!societyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('season_plans')
        .select('*').eq('society_id', societyId).order('season', { ascending: false });
      const list = (data ?? []) as Plan[];
      setPlans(list);
      if (list.length > 0 && !planId) setPlanId(list[0].id);
      setLoading(false);
    })();
  }, [societyId, planId]);

  /* Load phases */
  const loadPhases = useCallback(async (pid: string) => {
    const { data } = await supabase.from('season_phases')
      .select('*').eq('plan_id', pid).order('order_index', { ascending: true });
    type PhaseRow = {
      id: string; plan_id: string; name: string; order_index: number;
      start_date: string | null; end_date: string | null;
      goals: string | null; load_level: string | null;
      lavoro_tecnico: unknown; lavoro_tattico: unknown;
      tecnica_individuale: unknown; grid_data: unknown;
    };
    const list = ((data ?? []) as PhaseRow[]).map((r) => ({
      id: r.id, plan_id: r.plan_id, name: r.name, order_index: r.order_index,
      start_date: r.start_date, end_date: r.end_date, goals: r.goals, load_level: r.load_level,
      lavoro_tecnico: Array.isArray(r.lavoro_tecnico) ? (r.lavoro_tecnico as TextPoint[]) : [],
      lavoro_tattico: Array.isArray(r.lavoro_tattico) ? (r.lavoro_tattico as TextPoint[]) : [],
      tecnica_individuale: Array.isArray(r.tecnica_individuale) ? (r.tecnica_individuale as AtletaBlock[]) : [],
      grid_data: (r.grid_data && typeof r.grid_data === 'object') ? (r.grid_data as GridData) : {},
    })) as Phase[];
    setPhases(list);
  }, []);

  useEffect(() => { if (planId) loadPhases(planId); else setPhases([]); }, [planId, loadPhases]);

  /* Load athletes + skeletons */
  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from('athletes').select('id, first_name, last_name, role')
          .eq('society_id', societyId).order('last_name'),
        supabase.from('training_skeletons').select('id, name, schedule')
          .eq('society_id', societyId).order('name'),
      ]);
      setAthletes((a ?? []) as Athlete[]);
      setSkeletons((s ?? []) as SkeletonRow[]);
    })();
  }, [societyId]);

  /* Auto-save debounce */
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savePhase = useCallback(async (ph: Phase) => {
    const { error } = await supabase.from('season_phases').update({
      name: ph.name, order_index: ph.order_index,
      start_date: ph.start_date, end_date: ph.end_date,
      goals: ph.goals, load_level: ph.load_level,
      lavoro_tecnico: ph.lavoro_tecnico as unknown as never,
      lavoro_tattico: ph.lavoro_tattico as unknown as never,
      tecnica_individuale: ph.tecnica_individuale as unknown as never,
      grid_data: ph.grid_data as unknown as never,
    }).eq('id', ph.id);
    if (error) toast.error(`Errore salvataggio: ${error.message}`);
  }, []);

  const patchPhase = useCallback((id: string, patch: Partial<Phase>) => {
    setPhases(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      const changed = next.find(p => p.id === id);
      if (changed) {
        if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
        saveTimers.current[id] = setTimeout(() => { savePhase(changed); }, 2000);
      }
      return next;
    });
  }, [savePhase]);

  /* Create macrociclo */
  const addMacrociclo = async () => {
    if (!planId || !user) { toast.error('Nessun piano attivo'); return; }
    const defaultAthletes: AtletaBlock[] = athletes.slice(0, 4).map(a => ({
      id: safeUUID(),
      atleta_id: a.id,
      atleta_nome: `${a.first_name ?? ''} ${a.last_name}`.trim(),
      ruolo: a.role ?? '',
      punti: [],
    }));
    const empty = () => Array.from({ length: 4 }, () => ({ id: safeUUID(), testo: '' }));
    const nextOrder = phases.length;
    const { data, error } = await supabase.from('season_phases').insert({
      plan_id: planId,
      name: `Macrociclo ${nextOrder + 1}`,
      order_index: nextOrder,
      lavoro_tecnico: empty() as unknown as never,
      lavoro_tattico: empty() as unknown as never,
      tecnica_individuale: defaultAthletes as unknown as never,
      grid_data: {} as unknown as never,
    }).select('*').single();
    if (error || !data) { toast.error(error?.message ?? 'Errore'); return; }
    await loadPhases(planId);
    setSelectedPhaseId(data.id);
    toast.success('Macrociclo creato');
  };

  const deleteMacrociclo = async (id: string) => {
    await supabase.from('season_phases').delete().eq('id', id);
    if (planId) await loadPhases(planId);
    if (selectedPhaseId === id) setSelectedPhaseId(null);
  };

  /* Reorder macrocicli */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragEndMacros = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = phases.findIndex(p => p.id === active.id);
    const newI = phases.findIndex(p => p.id === over.id);
    if (oldI === -1 || newI === -1) return;
    const reordered = arrayMove(phases, oldI, newI).map((p, i) => ({ ...p, order_index: i }));
    setPhases(reordered);
    await Promise.all(reordered.map(p =>
      supabase.from('season_phases').update({ order_index: p.order_index }).eq('id', p.id),
    ));
  };

  const selectedPhase = phases.find(p => p.id === selectedPhaseId) ?? null;
  const gridPhase = phases.find(p => p.id === (gridPhaseId ?? phases[0]?.id ?? '')) ?? null;

  /* Custom fund handlers */
  const addCustomFundamental = (nome: string, sfondo: string, testo: string) => {
    if (allFundamentals.includes(nome)) { toast.error('Nome già esistente'); return; }
    setCustom(prev => [...prev, { id: safeUUID(), nome, colore_sfondo: sfondo, colore_testo: testo }]);
  };
  const renameCustom = (id: string, newName: string) => {
    setCustom(prev => prev.map(c => c.id === id ? { ...c, nome: newName } : c));
  };
  const deleteCustom = (id: string) => setCustom(prev => prev.filter(c => c.id !== id));
  const setColorOverride = (name: string, part: 'sfondo' | 'testo', value: string) => {
    setColorsOverride(prev => {
      const cur = prev[name] ?? colorFor(name);
      return { ...prev, [name]: { ...cur, [part]: value } };
    });
  };
  const resetColors = () => setColorsOverride({});

  /* Print dialog */
  const [printOpen, setPrintOpen] = useState(false);
  const handleDownloadPdf = async () => {
    try {
      const { default: JsPDFCtor } = await import('jspdf');
      const doc = new JsPDFCtor();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      const plan = plans.find(p => p.id === planId);
      doc.text(plan ? `${plan.name} · ${plan.season}` : 'Programmazione', 14, 20);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`${plan?.start_date ?? '—'} → ${plan?.end_date ?? '—'}`, 14, 27);

      let y = 40;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('Macrocicli', 14, y); y += 6;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      phases.forEach((ph) => {
        doc.text(`• ${ph.name}  (${weeksInPhase(ph)} sett.)  ${ph.start_date ?? '—'} → ${ph.end_date ?? '—'}`, 14, y);
        y += 5;
      });

      phases.forEach((ph) => {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(ph.name, 14, 20);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(`${ph.start_date ?? '—'} → ${ph.end_date ?? '—'} · ${weeksInPhase(ph)} settimane`, 14, 27);
        let yy = 40;
        const section = (title: string, pts: TextPoint[]) => {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(title, 14, yy); yy += 6;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
          if (pts.length === 0) { doc.text('—', 14, yy); yy += 6; return; }
          pts.forEach((p, i) => {
            const lines = doc.splitTextToSize(`${i + 1}. ${p.testo || '—'}`, 180) as string[];
            lines.forEach(l => { doc.text(l, 14, yy); yy += 5; });
          });
          yy += 4;
        };
        section('Lavoro tecnico', ph.lavoro_tecnico);
        section('Lavoro tattico', ph.lavoro_tattico);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Tecnica individuale', 14, yy); yy += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        ph.tecnica_individuale.forEach((a) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`${a.atleta_nome}${a.ruolo ? ` (${a.ruolo})` : ''}`, 14, yy); yy += 5;
          doc.setFont('helvetica', 'normal');
          a.punti.forEach((p, i) => {
            const lines = doc.splitTextToSize(`  ${i + 1}. ${p.testo || '—'}`, 180) as string[];
            lines.forEach(l => { doc.text(l, 14, yy); yy += 5; });
          });
          yy += 3;
        });
      });

      // Griglia
      if (gridPhase) {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(`Griglia — ${gridPhase.name}`, 14, 20);
        const wCount = weeksInPhase(gridPhase);
        const cellW = 24, cellH = 14, x0 = 14, y0 = 30;
        for (let w = 0; w < wCount; w++) {
          const yy = y0 + w * (cellH + 2);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.text(`S${w + 1}`, x0, yy + 8);
          for (let d = 0; d < 7; d++) {
            const bx = x0 + 10 + d * cellW;
            doc.setDrawColor(200); doc.rect(bx, yy, cellW, cellH);
            const blocks = gridPhase.grid_data?.[String(w)]?.[String(d)] ?? [];
            blocks.slice(0, 2).forEach((b, i) => {
              const c = colorFor(b.fundamental);
              const rgb = hexToRgb(c.sfondo); const rgbT = hexToRgb(c.testo);
              doc.setFillColor(rgb.r, rgb.g, rgb.b);
              doc.rect(bx + 1, yy + 1 + i * 6, cellW - 2, 5, 'F');
              doc.setTextColor(rgbT.r, rgbT.g, rgbT.b);
              doc.setFontSize(7);
              doc.text(b.fundamental.slice(0, 12), bx + 2, yy + 5 + i * 6);
              doc.setTextColor(0);
            });
          }
        }
      }
      doc.save(`programmazione-${plans.find(p => p.id === planId)?.name ?? 'stagione'}.pdf`);
      setPrintOpen(false);
    } catch (err) {
      toast.error(`Errore PDF: ${(err as Error).message}`);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Caricamento…</p></div>;

  return (
    <div className="container py-8 space-y-6 prog-page">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .prog-print, .prog-print * { visibility: visible; }
          .prog-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .grid-cell, .grid-block { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex items-start justify-between flex-wrap gap-4 no-print">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <div className="flex items-center gap-3 mb-1">
            <LayoutGrid className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Programmazione Stagionale</h1>
          </div>
          <p className="text-muted-foreground">Macrocicli, griglia settimanale e periodizzazione.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={planId ?? ''} onValueChange={(v) => setPlanId(v)}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Nessun piano" /></SelectTrigger>
            <SelectContent>
              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.season}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPrintOpen(true)}>
            <Printer className="w-4 h-4 mr-2" /> Stampa / PDF
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Nessun piano stagionale. Crea prima un piano dalla Periodizzazione.</p>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="no-print">
          <TabsList>
            <TabsTrigger value="macrocicli">Macrocicli</TabsTrigger>
            <TabsTrigger value="griglia">Griglia settimanale</TabsTrigger>
            <TabsTrigger value="grafico">Grafico macro</TabsTrigger>
          </TabsList>

          {/* ============== TAB MACROCICLI ============== */}
          <TabsContent value="macrocicli" className="mt-4">
            <div className="flex gap-4 items-start">
              <div className="w-[260px] shrink-0 space-y-2">
                <Button className="w-full" onClick={addMacrociclo}>
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi macrociclo
                </Button>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndMacros}>
                  <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {phases.map(ph => (
                        <SortableMacroCard
                          key={ph.id}
                          ph={ph}
                          active={selectedPhaseId === ph.id}
                          onClick={() => setSelectedPhaseId(ph.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {phases.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Nessun macrociclo.
                  </p>
                )}
              </div>

              <Card className="flex-1 p-6">
                {!selectedPhase ? (
                  <p className="text-muted-foreground text-center py-16">
                    Seleziona un macrociclo per vederne i dettagli.
                  </p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px] space-y-2">
                        <Input
                          value={selectedPhase.name}
                          onChange={(e) => patchPhase(selectedPhase.id, { name: e.target.value })}
                          className="text-lg font-bold"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-[10px] uppercase text-muted-foreground">Inizio</Label>
                            <Input type="date" value={selectedPhase.start_date ?? ''}
                              onChange={(e) => patchPhase(selectedPhase.id, { start_date: e.target.value || null })} />
                          </div>
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-[10px] uppercase text-muted-foreground">Fine</Label>
                            <Input type="date" value={selectedPhase.end_date ?? ''}
                              onChange={(e) => patchPhase(selectedPhase.id, { end_date: e.target.value || null })} />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => {
                          setGridPhaseId(selectedPhase.id); setTab('griglia');
                        }}>
                          <ArrowRight className="w-4 h-4 mr-2" /> Griglia
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm('Eliminare questo macrociclo?')) deleteMacrociclo(selectedPhase.id);
                        }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Elimina
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <PointsSection
                        title="Lavoro tecnico"
                        items={selectedPhase.lavoro_tecnico}
                        onChange={(v) => patchPhase(selectedPhase.id, { lavoro_tecnico: v })}
                      />
                      <PointsSection
                        title="Lavoro tattico"
                        items={selectedPhase.lavoro_tattico}
                        onChange={(v) => patchPhase(selectedPhase.id, { lavoro_tattico: v })}
                      />
                    </div>

                    <IndividualSection
                      phase={selectedPhase}
                      athletes={athletes}
                      onChange={(v) => patchPhase(selectedPhase.id, { tecnica_individuale: v })}
                    />

                    <div className="flex justify-end">
                      <Button onClick={() => { savePhase(selectedPhase); toast.success('Salvato'); }}>
                        Salva macrociclo
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ============== TAB GRIGLIA ============== */}
          <TabsContent value="griglia" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Macrociclo</Label>
              <Select
                value={gridPhaseId ?? phases[0]?.id ?? ''}
                onValueChange={(v) => { setGridPhaseId(v); setWeekOffset(0); }}
              >
                <SelectTrigger className="w-[240px]"><SelectValue placeholder="Scegli" /></SelectTrigger>
                <SelectContent>
                  {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => Math.max(0, w - 1))}>
                  <ChevronLeft className="w-4 h-4" /> Sett. prec.
                </Button>
                <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)}>Oggi</Button>
                <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w + 1)}>
                  Sett. succ. <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!gridPhase ? (
              <Card className="p-10 text-center"><p className="text-muted-foreground">Nessun macrociclo.</p></Card>
            ) : (
              <GridEditor
                phase={gridPhase}
                skeletons={skeletons}
                allFundamentals={allFundamentals}
                colorFor={colorFor}
                onAddCustom={addCustomFundamental}
                onChange={(gd) => patchPhase(gridPhase.id, { grid_data: gd })}
                weekOffset={weekOffset}
              />
            )}

            {/* Legenda */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold uppercase tracking-wide">Legenda colori</p>
                <Button size="sm" variant="ghost" onClick={resetColors}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset colori
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {allFundamentals.map(name => {
                  const c = colorFor(name);
                  const isCustom = custom.some(x => x.nome === name);
                  return (
                    <div key={name}
                      className="flex items-center gap-2 px-2 py-1 rounded border border-border">
                      <input
                        type="color" value={c.sfondo}
                        onChange={(e) => setColorOverride(name, 'sfondo', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer" title="Sfondo"
                      />
                      <input
                        type="color" value={c.testo}
                        onChange={(e) => setColorOverride(name, 'testo', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer" title="Testo"
                      />
                      <span className="text-xs font-medium" style={{ color: c.testo }}>{name}</span>
                      {isCustom && (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => {
                              const n = prompt('Nuovo nome', name);
                              const item = custom.find(x => x.nome === name);
                              if (n && item) renameCustom(item.id, n);
                            }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => {
                              const item = custom.find(x => x.nome === name);
                              if (item && confirm(`Eliminare "${name}"?`)) deleteCustom(item.id);
                            }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* ============== TAB GRAFICO ============== */}
          <TabsContent value="grafico" className="mt-4">
            <Suspense fallback={<p className="text-muted-foreground">Caricamento…</p>}>
              <Periodizzazione />
            </Suspense>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stampa o esporta PDF</DialogTitle>
            <DialogDescription>Scegli come esportare la programmazione stagionale.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 py-4">
            <Button onClick={handleDownloadPdf} className="flex-1">
              <Download className="w-4 h-4 mr-2" /> Scarica PDF
            </Button>
            <Button variant="outline" onClick={() => { setPrintOpen(false); setTimeout(() => window.print(), 100); }} className="flex-1">
              <Printer className="w-4 h-4 mr-2" /> Stampa
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPrintOpen(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual section                                                 */
/* ------------------------------------------------------------------ */

function IndividualSection({
  phase, athletes, onChange,
}: { phase: Phase; athletes: Athlete[]; onChange: (v: AtletaBlock[]) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const available = athletes.filter(a => !phase.tecnica_individuale.some(x => x.atleta_id === a.id));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide">Tecnica individuale</p>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Aggiungi atleta</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2 max-h-72 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">Tutti gli atleti sono già inseriti.</p>
            ) : available.map(a => (
              <button
                key={a.id} type="button"
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                onClick={() => {
                  onChange([...phase.tecnica_individuale, {
                    id: safeUUID(), atleta_id: a.id,
                    atleta_nome: `${a.first_name ?? ''} ${a.last_name}`.trim(),
                    ruolo: a.role ?? '', punti: [],
                  }]);
                  setAddOpen(false);
                }}
              >
                <span className="font-medium">{a.first_name} {a.last_name}</span>
                {a.role && <span className="text-muted-foreground text-xs"> · {a.role}</span>}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {phase.tecnica_individuale.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded">
          Nessun atleta assegnato.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {phase.tecnica_individuale.map((a, idx) => (
          <Card key={a.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                {initials(a.atleta_nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{a.atleta_nome}</p>
                {a.ruolo && <Badge variant="outline" className="text-[9px]">{a.ruolo}</Badge>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => onChange(phase.tecnica_individuale.filter(x => x.id !== a.id))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <PointsSection
              title="Punti"
              items={a.punti}
              onChange={(pts) => {
                const next = phase.tecnica_individuale.slice();
                next[idx] = { ...a, punti: pts };
                onChange(next);
              }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grid editor                                                        */
/* ------------------------------------------------------------------ */

function GridEditor({
  phase, skeletons, allFundamentals, colorFor, onAddCustom, onChange, weekOffset,
}: {
  phase: Phase;
  skeletons: SkeletonRow[];
  allFundamentals: string[];
  colorFor: (n: string) => FondColor;
  onAddCustom: (name: string, bg: string, fg: string) => void;
  onChange: (gd: GridData) => void;
  weekOffset: number;
}) {
  const totalWeeks = weeksInPhase(phase);
  const start = phase.start_date ? startOfWeek(new Date(phase.start_date)) : startOfWeek(new Date());
  const visible = Math.min(6, totalWeeks - weekOffset);

  const setCell = (w: number, d: number, blocks: GridBlock[]) => {
    const gd = { ...(phase.grid_data ?? {}) };
    const week = { ...(gd[String(w)] ?? {}) };
    if (blocks.length === 0) delete week[String(d)]; else week[String(d)] = blocks;
    if (Object.keys(week).length === 0) delete gd[String(w)]; else gd[String(w)] = week;
    onChange(gd);
  };

  const [importOpen, setImportOpen] = useState<null | number>(null); // week index
  const [importSkelId, setImportSkelId] = useState<string>('');
  const [importKeepColors, setImportKeepColors] = useState(true);

  const doImport = (weekIdx: number) => {
    const sk = skeletons.find(s => s.id === importSkelId);
    if (!sk) { toast.error('Seleziona uno scheletro'); return; }
    const gd = { ...(phase.grid_data ?? {}) };
    const week = { ...(gd[String(weekIdx)] ?? {}) };
    // schedule shape: { [day]: [{fundamental, note}] } best-effort
    const sched = (sk.schedule ?? {}) as Record<string, unknown>;
    for (let d = 0; d < 7; d++) {
      const raw = (sched[String(d)] ?? sched[DAYS[d]] ?? []) as unknown;
      if (!Array.isArray(raw)) continue;
      const blocks: GridBlock[] = raw.map((r) => {
        const rec = (r ?? {}) as Record<string, unknown>;
        const f = String(rec.fundamental ?? rec.name ?? rec.title ?? 'Situazionale');
        const n = rec.note ? String(rec.note) : undefined;
        return { id: safeUUID(), fundamental: f, note: n };
      });
      if (blocks.length > 0) week[String(d)] = [...(week[String(d)] ?? []), ...blocks];
    }
    gd[String(weekIdx)] = week;
    onChange(gd);
    setImportOpen(null); setImportSkelId('');
    toast.success('Scheletro importato');
    void importKeepColors;
  };

  return (
    <Card className="p-4 overflow-x-auto prog-print">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[88px_repeat(7,1fr)] gap-1 mb-1 text-[10px] uppercase font-bold text-muted-foreground">
          <div />
          {DAYS.map(d => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        {Array.from({ length: Math.max(1, visible) }).map((_, i) => {
          const w = weekOffset + i;
          if (w >= totalWeeks) return null;
          const weekStart = addDays(start, w * 7);
          const weekEnd = addDays(weekStart, 6);
          return (
            <div key={w} className="grid grid-cols-[88px_repeat(7,1fr)] gap-1 mb-1 group">
              <div className="text-[10px] p-2 border border-border rounded bg-muted/30 relative">
                <p className="font-bold">S{w + 1}</p>
                <p className="text-muted-foreground">{fmtDate(weekStart)}–{fmtDate(weekEnd)}</p>
                <button
                  type="button"
                  onClick={() => setImportOpen(w)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/70"
                  title="Importa scheletro"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
              {DAYS.map((_, d) => {
                const blocks = phase.grid_data?.[String(w)]?.[String(d)] ?? [];
                return (
                  <div key={d} className="grid-cell border border-border rounded p-1 min-h-[80px] space-y-1 bg-card">
                    {blocks.map((b) => (
                      <BlockChip
                        key={b.id}
                        block={b}
                        color={colorFor(b.fundamental)}
                        allFundamentals={allFundamentals}
                        onAddCustom={onAddCustom}
                        onChange={(next) => setCell(w, d, blocks.map(x => x.id === b.id ? next : x))}
                        onDuplicate={() => setCell(w, d, [...blocks, { ...b, id: safeUUID() }])}
                        onDelete={() => setCell(w, d, blocks.filter(x => x.id !== b.id))}
                      />
                    ))}
                    <AddBlockButton
                      allFundamentals={allFundamentals}
                      onAddCustom={onAddCustom}
                      onAdd={(f) => setCell(w, d, [...blocks, { id: safeUUID(), fundamental: f }])}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Dialog open={importOpen !== null} onOpenChange={(o) => { if (!o) setImportOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importa scheletro nella settimana</DialogTitle>
            <DialogDescription>I blocchi saranno aggiunti ai giorni della settimana selezionata.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={importSkelId} onValueChange={setImportSkelId}>
              <SelectTrigger><SelectValue placeholder="Scegli scheletro..." /></SelectTrigger>
              <SelectContent>
                {skeletons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={importKeepColors} onChange={() => setImportKeepColors(true)} />
                Mantieni colori originali
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={!importKeepColors} onChange={() => setImportKeepColors(false)} />
                Adatta al tema
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(null)}>Annulla</Button>
            <Button onClick={() => importOpen !== null && doImport(importOpen)}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BlockChip({
  block, color, allFundamentals, onAddCustom, onChange, onDuplicate, onDelete,
}: {
  block: GridBlock; color: FondColor;
  allFundamentals: string[];
  onAddCustom: (n: string, bg: string, fg: string) => void;
  onChange: (b: GridBlock) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid-block w-full text-left px-2 py-1 rounded text-[10px] font-semibold truncate"
          style={{ backgroundColor: color.sfondo, color: color.testo }}
          title={block.note ?? block.fundamental}
        >
          {block.fundamental}{block.note ? ' •' : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <FundamentalSelect
          value={block.fundamental}
          onChange={(v) => onChange({ ...block, fundamental: v })}
          allFundamentals={allFundamentals}
          onAddCustom={onAddCustom}
        />
        <Textarea
          placeholder="Nota (es. focus zona 1-5)"
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value || undefined })}
          rows={2}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDuplicate} className="flex-1">
            <Copy className="w-3 h-3 mr-1" /> Duplica
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} className="flex-1">
            <Trash2 className="w-3 h-3 mr-1" /> Elimina
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddBlockButton({
  allFundamentals, onAddCustom, onAdd,
}: {
  allFundamentals: string[];
  onAddCustom: (n: string, bg: string, fg: string) => void;
  onAdd: (fundamental: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-[10px] text-muted-foreground border border-dashed border-border rounded py-0.5 hover:bg-muted/40 hover:text-foreground"
        >
          + blocco
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <FundamentalSelect
          value=""
          onChange={(v) => { onAdd(v); setOpen(false); }}
          allFundamentals={allFundamentals}
          onAddCustom={onAddCustom}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.padEnd(6, '0');
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
