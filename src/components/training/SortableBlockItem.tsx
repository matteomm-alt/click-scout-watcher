import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { VOLLEY_ROLES } from '@/lib/volleyConstants';

export interface BlockDraft {
  key: string;          // chiave locale stabile (uuid client-side) per il DnD
  id?: string;          // id DB se esiste già
  title: string;
  description: string;
  exercise_id: string | null;
  duration_min: number | null;
  reps: number | null;
  intensity: string | null;
  players_count: number | null;
  roles: string[];
}

interface ExerciseLite {
  id: string;
  name: string;
  fundamental: string | null;
  tags: string[];
  duration_min: number | null;
}

interface Props {
  block: BlockDraft;
  index: number;
  exercises: ExerciseLite[];
  onChange: (patch: Partial<BlockDraft>) => void;
  onRemove: () => void;
}

const NONE = '__NONE__';
const INTENSITIES = ['Bassa', 'Media', 'Alta', 'Massimale'] as const;

export function SortableBlockItem({ block, index, exercises, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.key,
  });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const linkedExercise = block.exercise_id ? exercises.find((e) => e.id === block.exercise_id) : null;

  const onPickExercise = (id: string) => {
    if (id === NONE) {
      onChange({ exercise_id: null });
      return;
    }
    const ex = exercises.find((x) => x.id === id);
    if (!ex) return;
    onChange({
      exercise_id: id,
      title: block.title || ex.name,
      duration_min: block.duration_min ?? ex.duration_min ?? null,
    });
  };

  const toggleRole = (r: string) => {
    onChange({
      roles: block.roles.includes(r) ? block.roles.filter((x) => x !== r) : [...block.roles, r],
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* Header riga compatta */}
      <div className="flex items-center gap-2 p-2.5 bg-muted/30">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground"
          aria-label="Trascina per riordinare"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold tabular-nums text-muted-foreground w-6">#{index + 1}</span>
        <Input
          value={block.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Titolo blocco"
          className="flex-1 h-8"
        />
        <Input
          type="number"
          min="0"
          value={block.duration_min ?? ''}
          onChange={(e) => onChange({ duration_min: e.target.value ? parseInt(e.target.value, 10) : null })}
          placeholder="min"
          className="w-20 h-8 text-center"
          title="Durata in minuti"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Comprimi' : 'Espandi dettagli'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Elimina blocco"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Riepilogo veloce quando chiuso */}
      {!expanded && (linkedExercise || block.intensity || block.players_count || block.roles.length > 0) && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 text-xs border-t border-border">
          {linkedExercise && (
            <Badge variant="secondary" className="text-[10px]">
              {linkedExercise.name}
              {linkedExercise.fundamental && <span className="ml-1 opacity-70">· {linkedExercise.fundamental}</span>}
            </Badge>
          )}
          {block.intensity && <Badge variant="outline" className="text-[10px]">Intensità: {block.intensity}</Badge>}
          {block.players_count != null && <Badge variant="outline" className="text-[10px]">{block.players_count} giocatori</Badge>}
          {block.roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
          ))}
          {block.reps != null && <Badge variant="outline" className="text-[10px]">{block.reps} reps</Badge>}
        </div>
      )}

      {/* Pannello espanso */}
      {expanded && (
        <div className="p-3 space-y-3 border-t border-border bg-background/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Esercizio collegato</Label>
              <Select value={block.exercise_id ?? NONE} onValueChange={onPickExercise}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nessuno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nessuno</SelectItem>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}{ex.fundamental ? ` · ${ex.fundamental}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedExercise && linkedExercise.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {linkedExercise.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Intensità</Label>
              <Select value={block.intensity ?? NONE} onValueChange={(v) => onChange({ intensity: v === NONE ? null : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {INTENSITIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ripetizioni</Label>
              <Input
                type="number" min="0"
                value={block.reps ?? ''}
                onChange={(e) => onChange({ reps: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Numero giocatori (override)</Label>
              <Input
                type="number" min="1" max="14"
                value={block.players_count ?? ''}
                onChange={(e) => onChange({ players_count: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="h-9"
                placeholder="Eredita dalla seduta"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Ruoli target (override)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {VOLLEY_ROLES.map((r) => {
                const active = block.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note / descrizione</Label>
            <Textarea
              value={block.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              className="resize-none text-sm"
              placeholder="Dettagli, varianti, accorgimenti…"
            />
          </div>
        </div>
      )}
    </div>
  );
}
