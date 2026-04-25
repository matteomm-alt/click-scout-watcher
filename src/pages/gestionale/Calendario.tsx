import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, addDays, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

type ViewMode = 'week' | 'month' | 'season';

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

  // Range di caricamento in base alla vista
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
    // season — usa date società o fallback 1 set → 31 mag
    const year = new Date().getFullYear();
    const fallbackStart = new Date(year, 8, 1); // 1 settembre
    const fallbackEnd = new Date(year + 1, 4, 31); // 31 maggio
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

  // Carica eventi
  useEffect(() => {
    if (!societyId || !user) return;
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

      // Coach (non admin) vede solo i propri
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

      // Se admin, recupera nomi creatori
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
  }, [societyId, user, range.start, range.end, isAdmin, selectedEventTypes, teamFilter, refreshKey]);

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
      {/* Header */}
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
        <Link to="/calendario/nuovo">
          <Button size="lg" className="gap-2">
            <Plus className="w-4 h-4" /> Nuovo evento
          </Button>
        </Link>
        <ExcelImportDialog onConfirm={importExcelRows} disabled={!societyId || !user} />
      </div>

      {/* Toolbar */}
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

      {/* Vista */}
      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Caricamento eventi…</Card>
      ) : view === 'week' ? (
        <WeekView anchor={anchor} events={events} showCreator={isAdmin} />
      ) : view === 'month' ? (
        <MonthView anchor={anchor} events={events} />
      ) : (
        <SeasonView start={range.start} end={range.end} events={events} />
      )}

      {/* Legenda + impostazioni stagione */}
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
    </div>
  );
}
