import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutGrid, Plus, Trash2, ChevronLeft, ChevronRight,
  Download, Printer, Pencil, RotateCcw, ArrowRight, } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { safeUUID } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plan, TextPoint, AtletaBlock, GridData, Phase, Athlete, SkeletonRow, FondColor, CustomFond, DEFAULT_FONDAMENTALI, LS_CUSTOM, LS_COLORS, safeGet, safeSet, weeksInPhase, PointsSection, SortableMacroCard } from '@/components/programmazione/shared';
import { IndividualSection, GridEditor, hexToRgb } from '@/components/programmazione/GridSections';

const Periodizzazione = lazy(() => import('./Periodizzazione'));
/* ------------------------------------------------------------------ */
/* Main page                                                          */
/* ------------------------------------------------------------------ */


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

  // Creazione piano stagionale
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanSeason, setNewPlanSeason] = useState('');
  const [newPlanStart, setNewPlanStart] = useState('');
  const [newPlanEnd, setNewPlanEnd] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);


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
  const loadPlans = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    const { data } = await supabase.from('season_plans')
      .select('*').eq('society_id', societyId).order('season', { ascending: false });
    const list = (data ?? []) as Plan[];
    setPlans(list);
    setPlanId(prev => prev ?? (list.length > 0 ? list[0].id : null));
    setLoading(false);
  }, [societyId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const openCreatePlan = () => {
    setEditingPlanId(null);
    setNewPlanName(''); setNewPlanSeason('');
    setNewPlanStart(''); setNewPlanEnd('');
    setShowCreatePlan(true);
  };

  const openEditPlan = () => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setEditingPlanId(plan.id);
    setNewPlanName(plan.name ?? '');
    setNewPlanSeason(plan.season ?? '');
    setNewPlanStart(plan.start_date ?? '');
    setNewPlanEnd(plan.end_date ?? '');
    setShowCreatePlan(true);
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !newPlanSeason.trim()) {
      toast.error('Nome e stagione obbligatori');
      return;
    }
    if (!societyId || !user) {
      toast.error('Società non caricata, riprova');
      return;
    }
    setCreatingPlan(true);

    if (editingPlanId) {
      const { error } = await supabase
        .from('season_plans')
        .update({
          name: newPlanName.trim(),
          season: newPlanSeason.trim(),
          start_date: newPlanStart || null,
          end_date: newPlanEnd || null,
        })
        .eq('id', editingPlanId);
      setCreatingPlan(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Piano aggiornato');
      setShowCreatePlan(false);
      setEditingPlanId(null);
      await loadPlans();
      return;
    }

    const { data, error } = await supabase
      .from('season_plans')
      .insert({
        name: newPlanName.trim(),
        season: newPlanSeason.trim(),
        start_date: newPlanStart || null,
        end_date: newPlanEnd || null,
        society_id: societyId,
        created_by: user.id,
      })
      .select()
      .single();
    setCreatingPlan(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Piano creato');
    setShowCreatePlan(false);
    setNewPlanName(''); setNewPlanSeason('');
    setNewPlanStart(''); setNewPlanEnd('');
    await loadPlans();
    setPlanId(data.id);
  };

  const handleDeletePlan = async () => {
    if (!deletingPlanId) return;
    await supabase.from('season_phases').delete().eq('plan_id', deletingPlanId);
    const { error } = await supabase.from('season_plans').delete().eq('id', deletingPlanId);
    if (error) { toast.error(error.message); return; }
    toast.success('Piano eliminato');
    setDeletingPlanId(null);
    setPlanId(null);
    setSelectedPhaseId(null);
    await loadPlans();
  };


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
        supabase.from('training_skeletons').select('id, name, schedule, blocks')
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
            <h1 className="text-2xl sm:text-4xl font-black italic uppercase leading-none">Programmazione Stagionale</h1>
          </div>
          <p className="text-muted-foreground">Macrocicli, griglia settimanale e periodizzazione.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Select value={planId ?? ''} onValueChange={(v) => setPlanId(v)}>
            <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Nessun piano" /></SelectTrigger>
            <SelectContent>
              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.season}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="icon" variant="ghost" className="h-9 w-9"
            aria-label="Modifica piano" disabled={!planId} onClick={openEditPlan}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            aria-label="Elimina piano" disabled={!planId}
            onClick={() => setDeletingPlanId(planId)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={openCreatePlan}>
            <Plus className="w-3 h-3 mr-1" /> Nuovo piano
          </Button>

          <Button variant="outline" onClick={() => setPrintOpen(true)}>
            <Printer className="w-4 h-4 mr-2" /> Stampa / PDF
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-6 py-20">
            <p className="text-muted-foreground text-sm">
              Nessun piano stagionale ancora.
            </p>
            <Button onClick={openCreatePlan}>
              <Plus className="w-4 h-4 mr-2" /> Crea piano stagionale
            </Button>
          </div>
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
                            <Label className="text-xs uppercase text-muted-foreground">Inizio</Label>
                            <Input type="date" value={selectedPhase.start_date ?? ''}
                              onChange={(e) => patchPhase(selectedPhase.id, { start_date: e.target.value || null })} />
                          </div>
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-xs uppercase text-muted-foreground">Fine</Label>
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

      <Dialog open={showCreatePlan} onOpenChange={(o) => { setShowCreatePlan(o); if (!o) setEditingPlanId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlanId ? 'Modifica piano stagionale' : 'Nuovo piano stagionale'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label>Nome piano *</Label>
              <Input
                placeholder="es. Stagione 2025/26"
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
              />
            </div>
            <div>
              <Label>Stagione *</Label>
              <Input
                placeholder="es. 2025/26"
                value={newPlanSeason}
                onChange={e => setNewPlanSeason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data inizio</Label>
                <Input type="date" value={newPlanStart}
                  onChange={e => setNewPlanStart(e.target.value)} />
              </div>
              <div>
                <Label>Data fine</Label>
                <Input type="date" value={newPlanEnd}
                  onChange={e => setNewPlanEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreatePlan(false); setEditingPlanId(null); }}>
              Annulla
            </Button>
            <Button onClick={handleCreatePlan} disabled={creatingPlan}>
              {creatingPlan
                ? 'Salvataggio...'
                : editingPlanId ? 'Salva modifiche' : 'Crea piano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPlanId} onOpenChange={(o) => !o && setDeletingPlanId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminare il piano stagionale?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Verranno eliminati anche tutti i macrocicli collegati. L'azione è irreversibile.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlanId(null)}>Annulla</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletePlan}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

  );
}
