import { useEffect, useState } from 'react';
import { Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Plan {
  id: string;
  name: string;
  season: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

interface Phase {
  id: string;
  plan_id: string;
  name: string;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  goals: string | null;
  load_level: string | null;
}

const PHASE_COLOR: Record<string, string> = {
  Preparazione: 'bg-blue-500',
  'Pre-agonistica': 'bg-cyan-500',
  Agonistica: 'bg-primary',
  Scarico: 'bg-amber-500',
  Transizione: 'bg-emerald-500',
};
const PHASE_TEXT: Record<string, string> = {
  Preparazione: 'text-blue-300',
  'Pre-agonistica': 'text-cyan-300',
  Agonistica: 'text-primary',
  Scarico: 'text-amber-300',
  Transizione: 'text-emerald-300',
};
const LOAD_HEIGHT: Record<string, string> = {
  basso: 'h-6', medio: 'h-10', alto: 'h-14', 'molto alto': 'h-20',
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function weeksBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (7 * 86400000)) + 1);
}

export default function Periodizzazione() {
  const { societyId } = useActiveSociety();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('season_plans')
        .select('*')
        .eq('society_id', societyId)
        .order('season', { ascending: false });
      const list = (data as Plan[]) ?? [];
      setPlans(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    })();
  }, [societyId]);

  useEffect(() => {
    if (!selectedId) { setPhases([]); return; }
    (async () => {
      const { data } = await supabase
        .from('season_phases')
        .select('*')
        .eq('plan_id', selectedId)
        .order('order_index', { ascending: true });
      setPhases((data as Phase[]) ?? []);
    })();
  }, [selectedId]);

  const plan = plans.find(p => p.id === selectedId) ?? null;

  // Build week grid
  const grid = (() => {
    if (!plan?.start_date || !plan?.end_date) return null;
    const planStart = startOfWeek(new Date(plan.start_date));
    const planEnd = new Date(plan.end_date);
    const totalWeeks = weeksBetween(planStart, planEnd);
    const weekToDate = (i: number) => {
      const d = new Date(planStart);
      d.setDate(d.getDate() + i * 7);
      return d;
    };
    const phaseRanges = phases
      .filter(ph => ph.start_date && ph.end_date)
      .map(ph => {
        const s = startOfWeek(new Date(ph.start_date!));
        const e = new Date(ph.end_date!);
        const startWeek = Math.max(0, Math.round((s.getTime() - planStart.getTime()) / (7 * 86400000)));
        const widthWeeks = Math.max(1, Math.round((e.getTime() - s.getTime()) / (7 * 86400000)) + 1);
        return { phase: ph, startWeek, widthWeeks };
      });
    return { totalWeeks, weekToDate, phaseRanges };
  })();

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
        <div className="flex items-center gap-3 mb-1">
          <Workflow className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Periodizzazione</h1>
        </div>
        <p className="text-muted-foreground">Visualizzazione grafica delle fasi su scala settimanale.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <Workflow className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nessun piano stagionale trovato.</p>
          <Link to="/pianificazione">
            <Button size="sm">Crea un piano</Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-4 flex items-center gap-3 flex-wrap">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Piano</Label>
            <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.season}</SelectItem>)}
              </SelectContent>
            </Select>
            {plan && (
              <span className="text-xs text-muted-foreground ml-auto">
                {plan.start_date} → {plan.end_date} · {phases.length} fasi
              </span>
            )}
          </Card>

          {!grid ? (
            <Card className="p-10 text-center">
              <p className="text-muted-foreground">Aggiungi date inizio/fine al piano in <Link to="/pianificazione" className="text-primary underline">Pianificazione</Link> per vedere la timeline.</p>
            </Card>
          ) : (
            <Card className="p-6 overflow-x-auto">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-semibold">
                Timeline · {grid.totalWeeks} settimane
              </p>

              {/* Asse settimane */}
              <div
                className="grid mb-2 text-[9px] text-muted-foreground"
                style={{ gridTemplateColumns: `repeat(${grid.totalWeeks}, minmax(28px, 1fr))` }}
              >
                {Array.from({ length: grid.totalWeeks }).map((_, i) => {
                  const d = grid.weekToDate(i);
                  const isMonthStart = d.getDate() <= 7;
                  return (
                    <div key={i} className="text-center border-l border-border/30 pl-1">
                      {isMonthStart ? d.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase() : ''}
                    </div>
                  );
                })}
              </div>

              {/* Barre fasi */}
              <div className="space-y-3">
                {grid.phaseRanges.map(({ phase, startWeek, widthWeeks }) => (
                  <div key={phase.id} className="grid items-center gap-0"
                    style={{ gridTemplateColumns: `repeat(${grid.totalWeeks}, minmax(28px, 1fr))` }}>
                    <div
                      className={`${PHASE_COLOR[phase.name] ?? 'bg-muted'} ${LOAD_HEIGHT[phase.load_level ?? 'medio'] ?? 'h-10'} rounded flex items-center px-2 text-[10px] font-bold uppercase text-background shadow-md`}
                      style={{ gridColumn: `${startWeek + 1} / span ${widthWeeks}` }}
                      title={`${phase.name} · ${phase.start_date} → ${phase.end_date}${phase.load_level ? ' · carico ' + phase.load_level : ''}`}
                    >
                      <span className="truncate">{widthWeeks > 2 ? phase.name : phase.name.slice(0, 3)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-border/40">
                {Object.entries(PHASE_COLOR).map(([name, c]) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-3 h-3 rounded ${c}`} />
                    <span className="text-muted-foreground">{name}</span>
                  </div>
                ))}
                <div className="ml-auto text-xs text-muted-foreground">
                  Altezza barra = livello di carico
                </div>
              </div>
            </Card>
          )}

          {/* DETTAGLIO FASI */}
          {phases.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {phases.map(ph => (
                <Card key={ph.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-8 rounded ${PHASE_COLOR[ph.name] ?? 'bg-muted'}`} />
                    <div>
                      <p className={`font-bold uppercase italic ${PHASE_TEXT[ph.name] ?? ''}`}>{ph.name}</p>
                      <p className="text-[10px] text-muted-foreground">{ph.start_date} → {ph.end_date}</p>
                    </div>
                  </div>
                  {ph.load_level && <Badge variant="outline" className="text-[10px] mb-2">Carico: {ph.load_level}</Badge>}
                  {ph.goals && <p className="text-xs text-muted-foreground line-clamp-3">{ph.goals}</p>}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
