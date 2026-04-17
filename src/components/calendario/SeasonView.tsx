import { useNavigate } from 'react-router-dom';
import { format, eachMonthOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { getEventMeta } from '@/lib/eventTypes';
import type { CalendarEvent } from './types';
import { cn } from '@/lib/utils';

interface Props {
  start: Date;
  end: Date;
  events: CalendarEvent[];
}

/**
 * Vista stagionale: una colonna per mese tra start e end (parametri società),
 * con i giorni che hanno eventi raggruppati per tipo.
 */
export function SeasonView({ start, end, events }: Props) {
  const navigate = useNavigate();
  const months = eachMonthOfInterval({ start, end });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {months.map((month) => {
        const monthEvents = events
          .filter((e) => isSameMonth(new Date(e.start_at), month))
          .sort((a, b) => a.start_at.localeCompare(b.start_at));

        // raggruppa per giorno
        const byDay = new Map<string, CalendarEvent[]>();
        monthEvents.forEach((e) => {
          const key = format(new Date(e.start_at), 'yyyy-MM-dd');
          if (!byDay.has(key)) byDay.set(key, []);
          byDay.get(key)!.push(e);
        });

        return (
          <div key={month.toISOString()} className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-border">
              <h3 className="text-lg font-black uppercase italic">
                {format(month, 'MMMM', { locale: it })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {format(month, 'yyyy')} · {monthEvents.length} eventi
              </span>
            </div>

            {monthEvents.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nessun evento</p>
            )}

            <div className="flex flex-col gap-2">
              {Array.from(byDay.entries()).map(([dayKey, dayEvts]) => {
                const dayDate = new Date(dayKey);
                const isToday = isSameDay(dayDate, new Date());
                return (
                  <div key={dayKey} className="flex gap-2">
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center w-10 h-10 rounded shrink-0 border border-border',
                        isToday && 'border-primary text-primary',
                      )}
                    >
                      <span className="text-base font-black leading-none">
                        {format(dayDate, 'd')}
                      </span>
                      <span className="text-[8px] uppercase text-muted-foreground">
                        {format(dayDate, 'EEE', { locale: it })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {dayEvts.map((evt) => {
                        const meta = getEventMeta(evt.event_type);
                        const Icon = meta.icon;
                        return (
                          <button
                            key={evt.id}
                            onClick={() => navigate(`/calendario/nuovo?id=${evt.id}`)}
                            className={cn(
                              'flex items-center gap-1.5 text-xs px-2 py-1 rounded border-l-2 hover:bg-muted/50 transition-colors text-left',
                              meta.bgClass,
                              meta.borderClass,
                            )}
                          >
                            <Icon className={cn('w-3 h-3 shrink-0', meta.textClass)} />
                            <span className={cn('font-bold shrink-0', meta.textClass)}>
                              {format(new Date(evt.start_at), 'HH:mm')}
                            </span>
                            <span className="truncate">{evt.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
