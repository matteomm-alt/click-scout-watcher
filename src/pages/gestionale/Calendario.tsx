import { useEffect, useMemo, useState } from 'react';
import {
  format, addDays, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { EVENT_TYPES, type EventType } from '@/lib/eventTypes';
import { WeekView } from '@/components/calendario/WeekView';
import { MonthView } from '@/components/calendario/MonthView';
import { SeasonView } from '@/components/calendario/SeasonView';
import { CalendarFilters } from '@/components/calendario/CalendarFilters';
import { ExcelImportDialog, type ExcelEventPreview } from '@/components/calendario/ExcelImportDialog';
import type { CalendarEvent } from '@/components/calendario/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ViewMode = 'week' | 'month' | 'season';

interface EventForm {
  title: string;
  event_type: EventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  team_label: string;
}

export default function Calendario() {
  const { user } = useAuth();
  const { societyId, societyName, isAdmin, seasonStart, seasonEnd, loading: societyLoading } =
    useActiveSociety();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [teamFilter, setTeamFilter] = useState('all');
  const [teams, setTeams] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog evento
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: '',
    event_type: 'allenamento',
    start_at: '',
    end_at: '',
    location: '',
    description: '',
    team_label: '',
  });
  const [pendingScopeAction, setPendingScopeAction] = useState<'save' | 'delete' | null>(null);
  const [recurrence, setRecurrence] = useState<{
    enabled: boolean;
    interval: 'week' | 'biweek' | 'month';
    count: number;
  }>({ enabled: false, interval: 'week', count: 8 });

  const range = useMemo(() => {
    if (view === 'week') {
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6),
      };
    }
    if (view === 'month') {
      return {
        start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
      };
    }
    const year = new Date().getFullYear();
    const fallbackStart = new Date(year, 8, 1);
    const fallbackEnd = new Date(year + 1, 4, 31);
    return {
      start: seasonStart ? new Date(seasonStart) : fallbackStart,
      end: seasonEnd ? new Date(seasonEnd) : fallbackEnd,
    };
  }, [view, anchor, seasonStart, seasonEnd]);

  useEffect(() => {
    if (!societyId || !user) return;
    let cancelled = false;
    (async () => {
      const [{ data: athletesData, error: athletesError }, { data: teamsData, error: teamsError }] =
        await Promise.all([
          supabase.from('athletes').select('teams').eq('society_id', societyId),
          supabase.from('teams').select('name').eq('society_id', societyId),
        ]);

      if (cancelled) return;
      if (athletesError || teamsError) {
        console.error('teams load error', athletesError || teamsError);
        setTeams([]);
        return;
      }

      const labels = new Set<string>();
      (athletesData ?? []).forEach((athlete) => {
        athlete.teams?.forEach((team) => team && labels.add(team));
      });
      (teamsData ?? []).forEach((team) => team.name && labels.add(team.name));
      setTeams(Array.from(labels).sort((a, b) => a.localeCompare(b, 'it')));
    })();
    return () => {
      cancelled = true;
    };
  }, [societyId, user]);

  useEffect(() => {
    if (!societyId || !user) return;
    if (newEventOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from('events')
        .select('*')
        .eq('society_id', societyId)
        .gte('start_at', range.start.toISOString())
        .lte('start_at', range.end.toISOString())
        .order('start_at', { ascending: true });

      if (!isAdmin) {
        query = query.eq('created_by', user.id);
      }
      if (selectedEventTypes.length > 0) {
        query = query.in('event_type', selectedEventTypes);
      }
      if (teamFilter !== 'all') {
        query = query.eq('team_label', teamFilter);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.error('events load error', error);
        toast.error('Errore caricamento eventi');
        setEvents([]);
        setLoading(false);
        return;
      }

      let withCreators: CalendarEvent[] = (data ?? []) as CalendarEvent[];
      if (isAdmin && withCreators.length > 0) {
        const creatorIds = Array.from(new Set(withCreators.map((e) => e.created_by)));
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        const profMap = new Map(profs?.map((p) => [p.id, p.full_name]) ?? []);
        withCreators = withCreators.map((e) => ({
          ...e,
          creator_name: profMap.get(e.created_by) ?? null,
        }));
      }

      setEvents(withCreators);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [societyId, user, range.start, range.end, isAdmin, selectedEventTypes, teamFilter, refreshKey, newEventOpen]);

  const importExcelRows = async (rows: ExcelEventPreview[]) => {
    if (!societyId || !user) return;
    const { error } = await supabase.from('events').insert(
      rows.map((row) => ({
        society_id: societyId,
        created_by: user.id,
        start_at: row.start_at,
        event_type: row.event_type,
        title: row.title,
        location: row.location,
      })),
    );
    if (error) {
      console.error('excel import error', error);
      toast.error('Errore durante import Excel');
      throw error;
    }
    toast.success(`${rows.length} eventi importati`);
    setRefreshKey((value) => value + 1);
  };

  const openNew = () => {
    setEditingEvent(null);
    setEventForm({
      title: '', event_type: 'allenamento', start_at: '',
      end_at: '', location: '', description: '', team_label: '',
    });
    setRecurrence({ enabled: false, interval: 'week', count: 8 });
    setNewEventOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setEventForm({
      title: evt.title,
      event_type: evt.event_type as EventType,
      start_at: evt.start_at ? evt.start_at.slice(0, 16) : '',
      end_at: evt.end_at ? evt.end_at.slice(0, 16) : '',
      location: evt.location ?? '',
      description: evt.description ?? '',
      team_label: evt.team_label ?? '',
    });
    setRecurrence({ enabled: false, interval: 'week', count: 8 });
    setNewEventOpen(true);
  };

  const recurrenceDates = useMemo(() => {
    if (!recurrence.enabled || !eventForm.start_at) return [];
    const base = new Date(eventForm.start_at);
    const dates: Date[] = [];
    for (let i = 1; i < recurrence.count; i++) {
      const d = new Date(base);
      if (recurrence.interval === 'week') d.setDate(d.getDate() + i * 7);
      else if (recurrence.interval === 'biweek') d.setDate(d.getDate() + i * 14);
      else d.setMonth(d.getMonth() + i);
      dates.push(d);
    }
    return dates;
  }, [recurrence, eventForm.start_at]);

  const saveEvent = async () => {
    if (!societyId || !user || !eventForm.title.trim() || !eventForm.start_at) return;
    setSavingEvent(true);
    const payload = {
      title: eventForm.title.trim(),
      event_type: eventForm.event_type,
      start_at: new Date(eventForm.start_at).toISOString(),
      end_at: eventForm.end_at ? new Date(eventForm.end_at).toISOString() : null,
      location: eventForm.location.trim() || null,
      description: eventForm.description.trim() || null,
      team_label: eventForm.team_label.trim() || null,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from('events').update(payload).eq('id', editingEvent.id);
      if (error) { toast.error('Errore aggiornamento evento'); setSavingEvent(false); return; }
      toast.success('Evento aggiornato');
    } else {
      const { error } = await supabase
        .from('events').insert({ ...payload, society_id: societyId, created_by: user.id });
      if (error) { toast.error('Errore creazione evento'); setSavingEvent(false); return; }

      if (recurrence.enabled && recurrenceDates.length > 0) {
        const durationMs = eventForm.end_at
          ? new Date(eventForm.end_at).getTime() - new Date(eventForm.start_at).getTime()
          : 0;
        const { error: recErr } = await supabase.from('events').insert(
          recurrenceDates.map((d) => ({
            society_id: societyId,
            created_by: user.id,
            title: payload.title,
            event_type: payload.event_type,
            start_at: d.toISOString(),
            end_at: durationMs > 0
              ? new Date(d.getTime() + durationMs).toISOString()
              : null,
            location: payload.location,
            description: payload.description,
            team_label: payload.team_label,
          })),
        );
        if (recErr) {
          toast.error('Errore creazione eventi ricorrenti');
        } else {
          toast.success(`Creati ${recurrenceDates.length + 1} eventi ricorrenti`);
        }
      } else {
        toast.success(`Evento "${eventForm.title}" creato`);
      }
    }

    setSavingEvent(false);
    setNewEventOpen(false);
    setRefreshKey((v) => v + 1);
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    setSavingEvent(true);
    const { error } = await supabase
      .from('events').delete().eq('id', editingEvent.id);
    setSavingEvent(false);
    if (error) { toast.error('Errore eliminazione evento'); return; }
    toast.success('Evento eliminato');
    setNewEventOpen(false);
    setRefreshKey((v) => v + 1);
  };

  const goPrev = () => {
    if (view === 'week') setAnchor(addDays(anchor, -7));
    else if (view === 'month') setAnchor(subMonths(anchor, 1));
    else setAnchor(subMonths(anchor, 12));
  };
  const goNext = () => {
    if (view === 'week') setAnchor(addDays(anchor, 7));
    else if (view === 'month') setAnchor(addMonths(anchor, 1));
    else setAnchor(addMonths(anchor, 12));
  };

  const headerLabel = useMemo(() => {
    if (view === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`;
    }
    if (view === 'month') {
      return format(anchor, 'MMMM yyyy', { locale: it });
    }
    return `Stagione ${format(range.start, 'MMM yyyy', { locale: it })} → ${format(range.end, 'MMM yyyy', { locale: it })}`;
  }, [view, anchor, range.start, range.end]);

  if (societyLoading) {
    return (
      <div className="container py-10">
        <p className="text-muted-foreground">Caricamento società…</p>
      </div>
    );
  }

  if (!societyId) {
    return (
      <div className="container py-10">
        <Card className="p-8 text-center">
          <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-bold uppercase italic mb-2">Nessuna società</h2>
          <p className="text-sm text-muted-foreground">
            Devi appartenere a una società per usare il calendario. Contatta l'amministratore.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
            Gestionale Società · {societyName}
          </p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-9 h-9 text-primary" />
            Calendario
          </h1>
          {isAdmin && (
            <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wider">
              Admin · Vedi eventi di tutti i coach
            </Badge>
          )}
        </div>
        <Button size="lg" className="gap-2" onClick={openNew}>
          <Plus className="w-4 h-4" /> Nuovo evento
        </Button>
        <ExcelImportDialog onConfirm={importExcelRows} disabled={!societyId || !user} />
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          disabled={events.length === 0}
          onClick={() => {
            const lines = [
              'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VolleyScout Pro//IT',
              ...events.map((e) => {
                const start = e.start_at.replace(/[-:]/g, '').replace('.000Z', 'Z');
                const end = e.end_at ? e.end_at.replace(/[-:]/g, '').replace('.000Z', 'Z') : start;
                return [
                  'BEGIN:VEVENT',
                  `DTSTART:${start}`,
                  `DTEND:${end}`,
                  `SUMMARY:${e.title}`,
                  e.location ? `LOCATION:${e.location}` : '',
                  `DESCRIPTION:${e.event_type}`,
                  `UID:${e.id}@volleyscoutpro`,
                  'END:VEVENT',
                ].filter(Boolean).join('\r\n');
              }),
              'END:VCALENDAR',
            ];
            const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'calendario_volley.ics';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4" /> iCal
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          {(['week', 'month', 'season'] as ViewMode[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView(v)}
              className={cn(
                'h-7 px-3 text-xs uppercase tracking-wider',
                view === v && 'shadow-none',
              )}
            >
              {v === 'week' ? 'Settimana' : v === 'month' ? 'Mese' : 'Stagione'}
            </Button>
          ))}
        </div>

        {view !== 'season' && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAnchor(new Date())}
            >
              Oggi
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="text-base font-bold uppercase italic">{headerLabel}</div>
      </Card>

      <CalendarFilters
        selectedTypes={selectedEventTypes}
        onTypesChange={setSelectedEventTypes}
        teams={teams}
        selectedTeam={teamFilter}
        onTeamChange={setTeamFilter}
      />

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Caricamento eventi…</Card>
      ) : view === 'week' ? (
        <WeekView anchor={anchor} events={events} showCreator={isAdmin} onEventClick={openEdit} />
      ) : view === 'month' ? (
        <MonthView anchor={anchor} events={events} onEventClick={openEdit} />
      ) : (
        <SeasonView start={range.start} end={range.end} events={events} />
      )}

      <Card className="p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="text-muted-foreground uppercase tracking-wider font-bold">Legenda</span>
        {EVENT_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <span key={t.value} className="flex items-center gap-1.5">
              <Icon className={cn('w-3.5 h-3.5', t.textClass)} />
              <span className="capitalize">{t.label}</span>
            </span>
          );
        })}
        {view === 'season' && !seasonStart && !seasonEnd && (
          <span className="ml-auto text-muted-foreground italic">
            Stagione non configurata: uso 1 set → 31 mag (default)
          </span>
        )}
      </Card>

      {/* Dialog crea/modifica evento */}
      <Dialog
        open={newEventOpen}
        onOpenChange={(o) => {
          setNewEventOpen(o);
          if (!o) setRecurrence({ enabled: false, interval: 'week', count: 8 });
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Modifica evento' : 'Nuovo evento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Titolo *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Es. Allenamento Under 18"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Tipo</Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = eventForm.event_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setEventForm((f) => ({ ...f, event_type: t.value }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                        active
                          ? `${t.bgClass} ${t.textClass} border-current`
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Inizio *</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.start_at}
                  onChange={(e) => setEventForm((f) => ({ ...f, start_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Fine</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.end_at}
                  onChange={(e) => setEventForm((f) => ({ ...f, end_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Luogo</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Palestra, indirizzo…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Squadra</Label>
              <Input
                value={eventForm.team_label}
                onChange={(e) => setEventForm((f) => ({ ...f, team_label: e.target.value }))}
                placeholder="Es. U18 Femminile"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Note</Label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {!editingEvent && (
              <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">Ripeti evento</Label>
                  <button
                    type="button"
                    onClick={() => setRecurrence((r) => ({ ...r, enabled: !r.enabled }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors relative',
                      recurrence.enabled ? 'bg-primary' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all',
                        recurrence.enabled ? 'left-[22px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>

                {recurrence.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Ogni</span>
                      <select
                        value={recurrence.interval}
                        onChange={(e) =>
                          setRecurrence((r) => ({
                            ...r,
                            interval: e.target.value as 'week' | 'biweek' | 'month',
                          }))
                        }
                        className="flex-1 h-8 rounded-md border border-border bg-secondary text-xs px-2"
                      >
                        <option value="week">Settimana</option>
                        <option value="biweek">2 Settimane</option>
                        <option value="month">Mese</option>
                      </select>
                      <span className="text-muted-foreground">per</span>
                      <select
                        value={recurrence.count}
                        onChange={(e) =>
                          setRecurrence((r) => ({ ...r, count: Number(e.target.value) }))
                        }
                        className="w-20 h-8 rounded-md border border-border bg-secondary text-xs px-2"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20].map((n) => (
                          <option key={n} value={n}>{n} volte</option>
                        ))}
                      </select>
                    </div>

                    {recurrenceDates.length > 0 && (
                      <div className="space-y-1 text-[11px]">
                        <p className="text-muted-foreground uppercase tracking-wider font-bold">
                          Anteprima ({recurrenceDates.length + 1} eventi totali):
                        </p>
                        <p>
                          1. {eventForm.start_at
                            ? format(new Date(eventForm.start_at), 'EEE d MMM yyyy', { locale: it })
                            : '—'} <span className="text-primary">← questo</span>
                        </p>
                        {recurrenceDates.slice(0, 4).map((d, i) => (
                          <p key={i}>
                            {i + 2}. {format(d, 'EEE d MMM yyyy', { locale: it })}
                          </p>
                        ))}
                        {recurrenceDates.length > 4 && (
                          <p className="text-muted-foreground italic">
                            … e altri {recurrenceDates.length - 4} eventi
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={deleteEvent}
                disabled={savingEvent}
                className="mr-auto"
              >
                Elimina
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setNewEventOpen(false)}
              disabled={savingEvent}
            >
              Annulla
            </Button>
            <Button
              onClick={saveEvent}
              disabled={!eventForm.title.trim() || !eventForm.start_at || savingEvent}
              className="gap-2"
            >
              {savingEvent ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" />
                  Salvataggio…
                </>
              ) : editingEvent ? (
                'Salva modifiche'
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Crea evento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
