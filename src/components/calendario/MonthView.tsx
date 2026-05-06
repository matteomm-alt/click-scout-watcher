import { useNavigate } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { getEventMeta } from '@/lib/eventTypes';
import type { CalendarEvent } from './types';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date;
  events: CalendarEvent[];
}

export function MonthView({ anchor, events }: Props) {
  const navigate = useNavigate();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {dayLabels.map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold py-2 text-center border-r border-border last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = events
            .filter((e) => isSameDay(new Date(e.start_at), day))
            .sort((a, b) => a.start_at.localeCompare(b.start_at));
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, anchor);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[110px] border-r border-b border-border p-1.5 flex flex-col gap-1',
                (idx + 1) % 7 === 0 && 'border-r-0',
                idx >= days.length - 7 && 'border-b-0',
                !inMonth && 'bg-muted/20 opacity-50',
              )}
            >
              <span
                className={cn(
                  'text-sm font-bold self-end',
                  isToday && 'text-primary',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((evt) => {
                  const meta = getEventMeta(evt.event_type);
                  return (
                    <div key={evt.id} className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/calendario/nuovo?id=${evt.id}`)}
                        className={cn(
                          'flex-1 text-left text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate hover:bg-muted/50 transition-colors',
                          meta.bgClass,
                          meta.borderClass,
                          meta.textClass,
                        )}
                        title={evt.title}
                      >
                        <span className="font-bold mr-1">
                          {format(new Date(evt.start_at), 'HH:mm')}
                        </span>
                        <span className="text-foreground">{evt.title}</span>
                      </button>
                      {evt.event_type === 'partita' && (
                        <button
                          onClick={() => navigate(
                            `/convocazioni?event_id=${evt.id}&title=${encodeURIComponent(evt.title)}&date=${evt.start_at}&location=${encodeURIComponent((evt as any).location || '')}`,
                          )}
                          className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shrink-0"
                          title="Crea convocazione"
                        >
                          📋
                        </button>
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground italic">
                    +{dayEvents.length - 3} altro
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
