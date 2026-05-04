import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Save, Clock, Users, AlertCircle, Bookmark, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SortableBlockItem, type BlockDraft } from './SortableBlockItem';
import { VOLLEY_ROLES } from '@/lib/volleyConstants';

interface ExerciseLite {
  id: string;
  name: string;
  fundamental: string | null;
  tags: string[];
  duration_min: number | null;
}
interface TeamLite {
  id: string;
  name: string;
}
interface AthleteLite {
  id: string;
  team_id: string | null;
  first_name: string | null;
  last_name: string;
  number: number | null;
}
interface TemplateLite {
  id: string;
  template_name: string | null;
  title: string;
}

export interface TrainingFormValue {
  id?: string;
  team_id: string | null;
  title: string;
  scheduled_date: string;
  duration_min: number | null;
  status: 'programmato' | 'completato' | 'saltato';
  goal: string;
  notes: string;
  is_template: boolean;
  template_name: string;
  players_count: number | null;
  roles: string[];
  participating_athlete_ids: string[];
  blocks: BlockDraft[];
}

interface Props {
  value: TrainingFormValue;
  onChange: (v: TrainingFormValue) => void;
  exercises: ExerciseLite[];
  teams: TeamLite[];
  athletes: AthleteLite[];
  templates: TemplateLite[];
  onLoadTemplate: (templateId: string) => Promise<void>;
}

const NO_TEMPLATE = '__NONE__';
const NO_TEAM = '__NONE__';

export function TrainingForm({ value, onChange, exercises, teams, athletes, templates, onLoadTemplate }: Props) {
  const { toast } = useToast();
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [skeletons, setSkeletons] = useState<{ id: string; name: string; total_duration_min: number | null; blocks: unknown }[]>([]);
  const [selectedSkeletonId, setSelectedSkeletonId] = useState('');
  const [skeletonApplied, setSkeletonApplied] = useState(false);

  useEffect(() => {
    if (value.id) { setSkeletonApplied(true); return; }
    setSkeletonApplied(false);
    // eslint-disable-next-line
  }, [value.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('training_skeletons')
        .select('id, name, total_duration_min, blocks')
        .order('name');
      setSkeletons((data as typeof skeletons) ?? []);
    })();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const set = <K extends keyof TrainingFormValue>(k: K, v: TrainingFormValue[K]) => {
    onChange({ ...value, [k]: v });
  };

  // Atleti della squadra selezionata
  const teamRoster = useMemo(
    () => athletes.filter((a) => value.team_id && a.team_id === value.team_id),
    [athletes, value.team_id]
  );

  // Auto-popola partecipanti quando cambi squadra (solo se non già modificati manualmente)
  const [rosterAutoSet, setRosterAutoSet] = useState(false);
  useEffect(() => {
    if (value.team_id && !rosterAutoSet && value.participating_athlete_ids.length === 0) {
      const rosterIds = athletes.filter((a) => a.team_id === value.team_id).map((a) => a.id);
      if (rosterIds.length > 0) {
        onChange({ ...value, participating_athlete_ids: rosterIds });
        setRosterAutoSet(true);
      }
    }
    // eslint-disable-next-line
  }, [value.team_id]);

  // Calcoli durata
  const totalBlockMinutes = value.blocks.reduce((s, b) => s + (b.duration_min || 0), 0);
  const target = value.duration_min || 0;
  const durationDelta = target ? totalBlockMinutes - target : 0;

  const addBlock = () => {
    const newBlock: BlockDraft = {
      key: crypto.randomUUID(),
      title: `Blocco ${value.blocks.length + 1}`,
      description: '',
      exercise_id: null,
      duration_min: null,
      reps: null,
      intensity: null,
      players_count: null,
      roles: [],
    };
    set('blocks', [...value.blocks, newBlock]);
  };

  const updateBlock = (key: string, patch: Partial<BlockDraft>) => {
    set('blocks', value.blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };
  const removeBlock = (key: string) => {
    set('blocks', value.blocks.filter((b) => b.key !== key));
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.blocks.findIndex((b) => b.key === active.id);
    const newIndex = value.blocks.findIndex((b) => b.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    set('blocks', arrayMove(value.blocks, oldIndex, newIndex));
  };

  const toggleRole = (r: string) => {
    set('roles', value.roles.includes(r) ? value.roles.filter((x) => x !== r) : [...value.roles, r]);
  };
  const toggleAthlete = (id: string) => {
    set('participating_athlete_ids',
      value.participating_athlete_ids.includes(id)
        ? value.participating_athlete_ids.filter((x) => x !== id)
        : [...value.participating_athlete_ids, id]
    );
  };

  const handleTemplate = async (templateId: string) => {
    if (templateId === NO_TEMPLATE) return;
    setLoadingTpl(true);
    try {
      await onLoadTemplate(templateId);
      toast({ title: 'Template caricato', description: 'Modifica i campi e salva la nuova seduta.' });
    } finally {
      setLoadingTpl(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Carica da template */}
      {templates.length > 0 && !value.id && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
          <Bookmark className="w-4 h-4 text-primary shrink-0" />
          <Label className="text-xs uppercase tracking-wider text-primary font-semibold shrink-0">
            Parti da template
          </Label>
          <Select onValueChange={handleTemplate} value={NO_TEMPLATE} disabled={loadingTpl}>
            <SelectTrigger className="h-8 flex-1">
              {loadingTpl ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Carico…</span>
              ) : (
                <SelectValue placeholder="Scegli un template…" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE}>—</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.template_name || t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sezione testata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Titolo *</Label>
          <Input value={value.title} onChange={(e) => set('title', e.target.value)} placeholder="Es. Allenamento tecnico ricezione" />
        </div>
        <div>
          <Label>Squadra</Label>
          <Select value={value.team_id ?? NO_TEAM} onValueChange={(v) => set('team_id', v === NO_TEAM ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEAM}>— Nessuna</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {teams.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Nessuna squadra creata. Aggiungile dalla pagina Atleti per associare le sedute.
            </p>
          )}
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={value.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} />
        </div>
        <div>
          <Label>Durata target (min)</Label>
          <Input
            type="number" min="0"
            value={value.duration_min ?? ''}
            onChange={(e) => set('duration_min', e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="Es. 90"
          />
        </div>
        <div>
          <Label>Stato</Label>
          <Select value={value.status} onValueChange={(v) => set('status', v as TrainingFormValue['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programmato">Programmato</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="saltato">Saltato</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Solo "completato" entra nel calcolo dei volumi.</p>
        </div>
        <div className="md:col-span-2">
          <Label>Obiettivo della seduta</Label>
          <Input value={value.goal} onChange={(e) => set('goal', e.target.value)} placeholder="Es. Migliorare ricezione zona 5" />
        </div>
      </div>

      {/* Numero giocatori + ruoli */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold uppercase italic tracking-wider text-muted-foreground">
          <Users className="w-4 h-4" /> Giocatori e ruoli (a livello seduta)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Numero giocatori previsto</Label>
            <Input
              type="number" min="1" max="14"
              value={value.players_count ?? ''}
              onChange={(e) => set('players_count', e.target.value ? parseInt(e.target.value, 10) : null)}
              placeholder="Es. 12"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Ruoli coinvolti</Label>
            <div className="flex flex-wrap gap-1.5">
              {VOLLEY_ROLES.map((r) => {
                const active = value.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Atleti partecipanti */}
        {value.team_id && teamRoster.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>
                Atleti partecipanti ({value.participating_athlete_ids.length}/{teamRoster.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => set('participating_athlete_ids', teamRoster.map((a) => a.id))}
                >
                  Seleziona tutti
                </Button>
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => set('participating_athlete_ids', [])}
                >
                  Pulisci
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-md bg-background border border-border">
              {teamRoster.map((a) => {
                const active = value.participating_athlete_ids.includes(a.id);
                const label = `${a.number ? `#${a.number} ` : ''}${a.last_name}${a.first_name ? ` ${a.first_name[0]}.` : ''}`;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAthlete(a.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Blocchi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase italic tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Blocchi della seduta
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trascina per riordinare. Ogni blocco può essere collegato a un esercizio per ereditarne fondamentale e tag.
            </p>
          </div>
          <Button type="button" onClick={addBlock} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Aggiungi blocco
          </Button>
        </div>

        {/* Anteprima durata */}
        {value.blocks.length > 0 && (
          <div className={`rounded-lg border p-3 flex items-center justify-between text-sm ${
            target && Math.abs(durationDelta) > 5
              ? 'border-yellow-500/40 bg-yellow-500/5'
              : 'border-border bg-muted/30'
          }`}>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <span className="font-bold tabular-nums">{totalBlockMinutes} min</span>
                {target > 0 && (
                  <span className="text-muted-foreground ml-1">/ {target} min target</span>
                )}
              </div>
            </div>
            {target > 0 && Math.abs(durationDelta) > 5 && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {durationDelta > 0 ? `+${durationDelta} min sopra il target` : `${durationDelta} min sotto il target`}
              </div>
            )}
          </div>
        )}

        {value.blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nessun blocco — clicca "Aggiungi blocco" per iniziare a comporre la seduta.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={value.blocks.map((b) => b.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {value.blocks.map((b, i) => (
                  <SortableBlockItem
                    key={b.key}
                    block={b}
                    index={i}
                    exercises={exercises}
                    onChange={(p) => updateBlock(b.key, p)}
                    onRemove={() => removeBlock(b.key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Note + template */}
      <div className="space-y-3">
        <div>
          <Label>Note generali</Label>
          <Textarea
            value={value.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="Eventuali appunti, materiali, osservazioni…"
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-start gap-3">
          <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm">Salva come template</Label>
                <p className="text-xs text-muted-foreground">L'allenamento sarà riutilizzabile per future sedute.</p>
              </div>
              <Switch checked={value.is_template} onCheckedChange={(v) => set('is_template', v)} />
            </div>
            {value.is_template && (
              <Input
                value={value.template_name}
                onChange={(e) => set('template_name', e.target.value)}
                placeholder="Nome template (es. 'Tecnico ricezione - U18')"
                className="h-9"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
