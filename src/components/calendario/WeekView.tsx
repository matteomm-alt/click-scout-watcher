import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { getEventMeta } from '@/lib/eventTypes';
import type { CalendarEvent } from './types';
import { cn } from '@/lib/utils';

interface Props {
  anchor: Date; // qualsiasi data della settimana
  events: CalendarEvent[];
  showCreator: boolean;
}

export function WeekView({ anchor, events, showCreator }: Props) {
  const navigate = useNavigate();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDay(new Date(e.start_at), day))
          .sort((a, b) => a.start_at.localeCompare(b.start_at));
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toISOString()}
            className={cn(
              'border border-border rounded-lg bg-card p-2 min-h-[180px] flex flex-col',
              isToday && 'border-primary',
            )}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {format(day, 'EEE', { locale: it })}
              </span>
              <span
                className={cn(
                  'text-2xl font-black italic leading-none',
                  isToday && 'text-primary',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              {dayEvents.length === 0 && (
                <span className="text-[11px] text-muted-foreground/50 italic">—</span>
              )}
              {dayEvents.map((evt) => {
                const meta = getEventMeta(evt.event_type);
                const Icon = meta.icon;
                return (
                  <button
                    key={evt.id}
                    onClick={() => navigate(`/calendario/nuovo?id=${evt.id}`)}
                    className={cn(
                      'text-left text-xs p-2 rounded-md border-l-2 hover:bg-muted/50 transition-colors',
                      meta.bgClass,
                      meta.borderClass,
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('w-3 h-3 shrink-0', meta.textClass)} />
                      <span className={cn('font-bold truncate', meta.textClass)}>
                        {format(new Date(evt.start_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="font-semibold truncate text-foreground mt-0.5">{evt.title}</p>
                    {evt.location && (
                      <p className="text-[10px] text-muted-foreground truncate">{evt.location}</p>
                    )}
                    {showCreator && evt.creator_name && (
                      <p className="text-[10px] text-muted-foreground/70 truncate italic">
                        {evt.creator_name}
                      </p>
                    )}
                    {evt.event_type === 'partita' && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/convocazioni?event_id=${evt.id}&title=${encodeURIComponent(evt.title)}&date=${evt.start_at}&location=${encodeURIComponent(evt.location || '')}`,
                          );
                        }}
                        className="mt-1.5 inline-flex items-center min-h-7 px-2 text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20"
                      >
                        📋 Convocazione
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
