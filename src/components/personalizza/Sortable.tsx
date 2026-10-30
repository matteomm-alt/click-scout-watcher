import type { ReactNode } from 'react';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const restrictToVerticalAxis = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => ({ ...transform, x: 0 });

/** Lista riordinabile con trascinamento (mouse/dito) o tastiera (Spazio + frecce sulla maniglia). */
export function SortableList<T extends string>({
  ids, onReorder, disabled, children,
}: { ids: T[]; onReorder: (next: T[]) => void; disabled?: boolean; children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (disabled || !over || active.id === over.id) return;
    const from = ids.indexOf(active.id as T);
    const to = ids.indexOf(over.id as T);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
    </DndContext>
  );
}

export function SortableRow({
  id, label, disabled, className = '', children,
}: { id: string; label: string; disabled?: boolean; className?: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 ${className} ${isDragging ? 'relative z-10 shadow-lg ring-2 ring-primary/40 bg-card' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Trascina per spostare ${label}`}
        className="touch-none cursor-grab active:cursor-grabbing shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
