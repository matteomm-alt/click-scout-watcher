import { useRef, useState, type ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

/** Cella giorno che accetta il rilascio di un evento trascinato. */
export function DayDropZone({
  dayKey,
  className,
  children,
}: {
  dayKey: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'ring-2 ring-primary ring-inset bg-primary/5')}
    >
      {children}
    </div>
  );
}

/** Wrapper trascinabile per una card evento. */
export function DraggableEvent({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('touch-none', isDragging && 'opacity-40', className)}
    >
      {children}
    </div>
  );
}

/**
 * Maniglia da trascinare verticalmente per modificare la durata dell'evento.
 * 4px ≈ 15 minuti, con snap a step di 15.
 */
export function ResizeHandle({ onResize }: { onResize: (deltaMinutes: number) => void }) {
  const startY = useRef<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const snap = (dy: number) => Math.round(dy / 4) * 15;

  return (
    <div
      role="separator"
      title="Trascina in verticale per cambiare la durata"
      className="mt-1 h-2 rounded cursor-ns-resize bg-border/70 hover:bg-primary/60 relative touch-none"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startY.current = e.clientY;
        setPreview(0);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (startY.current === null) return;
        setPreview(snap(e.clientY - startY.current));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (startY.current === null) return;
        const delta = snap(e.clientY - startY.current);
        startY.current = null;
        setPreview(null);
        if (delta !== 0) onResize(delta);
      }}
      onPointerCancel={() => {
        startY.current = null;
        setPreview(null);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {preview !== null && (
        <span className="absolute -top-5 right-0 text-[10px] font-bold text-primary bg-card border border-border rounded px-1">
          {preview > 0 ? `+${preview}` : preview} min
        </span>
      )}
    </div>
  );
}
