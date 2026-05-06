import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Dumbbell, AlertTriangle, MapPin, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface NextEvent {
  id: string;
  title: string;
  start_at: string;
  location: string | null;
  event_type: string;
}

interface DvwKpi {
  total: number;
  wins: number;
  winRate: number;
  lastResult: { won: boolean; opponent: string; date: string | null } | null;
}

interface RecentTraining {
  id: string;
  title: string;
  scheduled_date: string | null;
}

interface AttendanceAlert {
  athleteId: string;
  name: string;
  pct: number;
  total: number;
}

export function HomeDashboard() {
  const { societyId, isAdmin } = useActiveSociety();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [dvw, setDvw] = useState<DvwKpi>({ total: 0, wins: 0, winRate: 0, lastResult: null });
  const [trainings, setTrainings] = useState<RecentTraining[]>([]);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!societyId || !user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();

      const [eventRes, dvwRes, trainingsRes, athletesRes, attRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_at, location, event_type')
          .eq('society_id', societyId)
          .gte('start_at', nowIso)
          .order('start_at', { ascending: true })
          .limit(1),
        supabase
          .from('scout_matches')
          .select('id, home_sets_won, away_sets_won, match_date, away_team:away_team_id(name), home_team:home_team_id(name)')
          .eq('coach_id', user.id)
          .order('match_date', { ascending: false }),
        supabase
          .from('trainings')
          .select('id, title, scheduled_date')
          .eq('society_id', societyId)
          .order('scheduled_date', { ascending: false, nullsFirst: false })
          .limit(3),
        supabase
          .from('athletes')
          .select('id, last_name, first_name')
          .eq('society_id', societyId),
        supabase
          .from('attendances')
          .select('athlete_id, status')
          .eq('society_id', societyId),
      ]);

      setNextEvent((eventRes.data?.[0] as NextEvent) ?? null);

      const dvwRows = (dvwRes.data ?? []) as any[];
      const total = dvwRows.length;
      const wins = dvwRows.filter((m: any) => m.home_sets_won > m.away_sets_won).length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      const lastRow = dvwRows[0];
      const lastResult = lastRow ? {
        won: lastRow.home_sets_won > lastRow.away_sets_won,
        opponent: lastRow.away_team?.name ?? '—',
        date: lastRow.match_date,
      } : null;
      setDvw({ total, wins, winRate, lastResult });

      setTrainings((trainingsRes.data as RecentTraining[]) ?? []);

      // Attendance alert calc
      const athletes = athletesRes.data ?? [];
      const attendances = attRes.data ?? [];
      const byAthlete = new Map<string, { presente: number; total: number }>();
      attendances.forEach((a) => {
        const cur = byAthlete.get(a.athlete_id) ?? { presente: 0, total: 0 };
        cur.total += 1;
        if (a.status === 'presente') cur.presente += 1;
        byAthlete.set(a.athlete_id, cur);
      });
      const alertList: AttendanceAlert[] = athletes
        .map((ath) => {
          const stats = byAthlete.get(ath.id);
          if (!stats || stats.total < 3) return null; // serve un minimo storico
          const pct = Math.round((stats.presente / stats.total) * 100);
          if (pct >= 70) return null;
          const name = `${ath.last_name}${ath.first_name ? ' ' + ath.first_name : ''}`;
          return { athleteId: ath.id, name, pct, total: stats.total };
        })
        .filter((x): x is AttendanceAlert => x !== null)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 5);
      setAlerts(alertList);

      setLoading(false);
    };
    load();
  }, [societyId, user]);

  if (!societyId) return null;

  if (loading) {
    return (
      <section className="container pb-16 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </section>
    );
  }

  const daysUntil = nextEvent
    ? Math.max(0, Math.ceil((new Date(nextEvent.start_at).getTime() - Date.now()) / 86400000))
    : null;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <section className="container pb-16 space-y-8">
      {/* Section heading */}
      <div className="pt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Dashboard</p>
        <h3 className="text-3xl md:text-4xl font-black italic uppercase leading-none">Panoramica</h3>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '✅', label: 'Presenze oggi', href: '/presenze' },
            { icon: '📋', label: 'Nuova convocazione', href: '/convocazioni?new=1' },
            { icon: '🔴', label: 'Scout Live', href: '/scout' },
          ].map((a) => (
            <button
              key={a.href}
              onClick={() => navigate(a.href)}
              className="min-h-16 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-center px-1">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* PROSSIMO EVENTO — hero */}
      <Card className="relative overflow-hidden p-8 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
        <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Prossimo evento</p>
            {loading ? (
              <p className="text-muted-foreground">Caricamento…</p>
            ) : nextEvent ? (
              <>
                <h4 className="text-2xl md:text-3xl font-black italic uppercase leading-none mb-3 truncate">
                  {nextEvent.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(nextEvent.start_at).toLocaleString('it-IT', {
                      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {nextEvent.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {nextEvent.location}
                    </span>
                  )}
                  <Badge variant="outline" className="uppercase text-[10px]">{nextEvent.event_type}</Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nessun evento programmato.</p>
            )}
          </div>
          {daysUntil !== null && (
            <div className="text-right flex-shrink-0">
              <p className="text-5xl font-black italic text-primary leading-none">{daysUntil}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                {daysUntil === 1 ? 'giorno' : 'giorni'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* KPI DVW */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">KPI stagione DVW</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Partite</p>
            <p className="text-3xl font-black">{dvw.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Vittorie</p>
            <p className="text-3xl font-black text-primary">{dvw.wins}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Win rate
            </p>
            <p className="text-3xl font-black">{dvw.winRate}<span className="text-lg">%</span></p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Ultima
            </p>
            {dvw.lastResult ? (
              <>
                <p className={`text-2xl font-black ${dvw.lastResult.won ? 'text-primary' : 'text-destructive'}`}>
                  {dvw.lastResult.won ? 'V' : 'P'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  vs {dvw.lastResult.opponent || '—'}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">—</p>
            )}
          </Card>
        </div>
      </div>

      {/* ULTIMI ALLENAMENTI + ALERT PRESENZE */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5" /> Ultimi allenamenti
            </p>
            <Link to="/allenamenti" className="text-xs text-primary font-bold hover:underline">Tutti →</Link>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-sm">Caricamento…</p>
          ) : trainings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nessun allenamento registrato.</p>
          ) : (
            <div className="space-y-2">
              {trainings.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="font-medium truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">{formatDate(t.scheduled_date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Alert presenze
            </p>
            <Link to="/presenze" className="text-xs text-primary font-bold hover:underline">Gestisci →</Link>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-sm">Caricamento…</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tutti gli atleti sopra il 70% di presenze. 👍</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.athleteId} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="font-medium truncate">{a.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{a.total} ev.</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5">{a.pct}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
