import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BookOpen, Plus, Search, GripVertical, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface LibraryExercise {
  id: string;
  name: string;
  fundamental: string | null;
  duration_min: number | null;
  tags: string[];
}

export const LIB_DRAG_PREFIX = 'lib:';
const ALL_FUND = '__ALL__';

function DraggableExercise({
  ex, onAdd,
}: { ex: LibraryExercise; onAdd: (ex: LibraryExercise) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${LIB_DRAG_PREFIX}${ex.id}`,
    data: { exercise: ex },
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border border-border bg-background p-2 flex items-start gap-1.5 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground mt-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight truncate">{ex.name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {ex.fundamental && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ex.fundamental}</Badge>
          )}
          {ex.duration_min ? (
            <span className="text-[10px] text-muted-foreground">{ex.duration_min} min</span>
          ) : null}
        </div>
      </div>
      <Button
        type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0"
        onClick={() => onAdd(ex)}
        title="Aggiungi come nuovo blocco"
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function ExerciseLibraryPanel({
  exercises, open, onToggle, onAdd,
}: {
  exercises: LibraryExercise[];
  open: boolean;
  onToggle: () => void;
  onAdd: (ex: LibraryExercise) => void;
}) {
  const [q, setQ] = useState('');
  const [fund, setFund] = useState(ALL_FUND);

  const fundamentals = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.fundamental).filter(Boolean) as string[])).sort(),
    [exercises]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return exercises.filter((e) =>
      (!term || e.name.toLowerCase().includes(term)) &&
      (fund === ALL_FUND || e.fundamental === fund)
    );
  }, [exercises, q, fund]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 self-start rounded-lg border border-border bg-muted/30 px-2 py-3 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
        title="Apri libreria esercizi"
      >
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-bold [writing-mode:vertical-rl]">
          Libreria esercizi
        </span>
      </button>
    );
  }

  return (
    <div className="shrink-0 w-[280px] rounded-lg border border-border bg-muted/20 p-3 space-y-2 self-start">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-primary" /> Libreria esercizi
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={onToggle}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca esercizio…" className="h-8 pl-7 text-xs"
        />
      </div>

      <Select value={fund} onValueChange={setFund}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FUND}>Tutti i fondamentali</SelectItem>
          {fundamentals.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>

      <p className="text-[10px] text-muted-foreground">
        Trascina un esercizio su un blocco per collegarlo, oppure usa “+”.
      </p>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">Nessun esercizio</p>
        ) : filtered.map((ex) => (
          <DraggableExercise key={ex.id} ex={ex} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}
