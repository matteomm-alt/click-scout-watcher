import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'team_dashboard_sections_v1';

interface SectionFlags {
  roster: boolean;
  attendance: boolean;
  injuries: boolean;
  trainings: boolean;
  evaluations: boolean;
  convocations: boolean;
}

const DEFAULT_FLAGS: SectionFlags = {
  roster: true,
  attendance: true,
  injuries: true,
  trainings: true,
  evaluations: true,
  convocations: true,
};

function loadFlags(): SectionFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLAGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return DEFAULT_FLAGS;
  }
}

function saveFlags(flags: SectionFlags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    /* storage unavailable */
  }
}

interface Team {
  id: string;
  name: string;
  category: string | null;
  age_group: string | null;
  season: string | null;
}

interface Athlete {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  number: number | null;
}

interface Injury {
  id: string;
  body_part: string | null;
  injury_type: string | null;
  start_date: string | null;
  status: string | null;
  athlete_id: string;
}

interface Training {
  id: string;
  title: string | null;
  scheduled_date: string | null;
  status: string | null;
}

interface Evaluation {
  fundamental: string | null;
  score: number | null;
  evaluated_at: string | null;
  athlete_id: string;
}

interface Convocation {
  id: string;
  title: string | null;
  match_date: string | null;
}

const SECTION_LABELS: Record<keyof SectionFlags, string> = {
  roster: 'Rosa atleti',
  attendance: 'Presenze',
  injuries: 'Infortuni',
  trainings: 'Allenamenti',
  evaluations: 'Valutazioni',
  convocations: 'Convocazioni',
};

export default function TeamDashboard() {
  const { id } = useParams<{ id: string }>();
  const [flags, setFlags] = useState<SectionFlags>(() => loadFlags());
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendances, setAttendances] = useState<{ status: string | null }[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [convocations, setConvocations] = useState<Convocation[]>([]);

  const updateFlag = (k: keyof SectionFlags, v: boolean) => {
    setFlags((prev) => {
      const next = { ...prev, [k]: v };
      saveFlags(next);
      return next;
    });
  };

  const allOff = !Object.values(flags).some(Boolean);

  // Load team header
  useEffect(() => {
    if (!id) return;
    setTeamLoading(true);
    supabase
      .from('teams')
      .select('id, name, category, age_group, season')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setTeam(data as Team | null);
        setTeamLoading(false);
      });
  }, [id]);

  // Roster (needed for other sections too)
  useEffect(() => {
    if (!id || !flags.roster) {
      // ensure athletes stays empty if roster off (dependent sections still need it — but user asked flag off means no fetch)
      if (!flags.roster) setAthletes([]);
      return;
    }
    supabase
      .from('athletes')
      .select('*')
      .eq('team_id', id)
      .order('last_name')
      .then(({ data }) => setAthletes((data as Athlete[]) ?? []));
  }, [id, flags.roster]);

  const athleteIds = useMemo(() => athletes.map((a) => a.id), [athletes]);
  const athleteById = useMemo(() => {
    const m = new Map<string, Athlete>();
    athletes.forEach((a) => m.set(a.id, a));
    return m;
  }, [athletes]);

  // Attendances
  useEffect(() => {
    if (!id || !flags.attendance || athleteIds.length === 0) return;
    supabase
      .from('attendances')
      .select('status, athlete_id')
      .in('athlete_id', athleteIds)
      .then(({ data }) => setAttendances((data as { status: string | null }[]) ?? []));
  }, [id, flags.attendance, athleteIds]);

  // Injuries
  useEffect(() => {
    if (!id || !flags.injuries || athleteIds.length === 0) return;
    supabase
      .from('athlete_injuries')
      .select('id, body_part, injury_type, start_date, status, athlete_id')
      .in('athlete_id', athleteIds)
      .eq('status', 'attivo')
      .then(({ data }) => setInjuries((data as Injury[]) ?? []));
  }, [id, flags.injuries, athleteIds]);

  // Trainings
  useEffect(() => {
    if (!id || !flags.trainings) return;
    supabase
      .from('trainings')
      .select('id, title, scheduled_date, status')
      .eq('team_id', id)
      .order('scheduled_date', { ascending: false })
      .limit(10)
      .then(({ data }) => setTrainings((data as Training[]) ?? []));
  }, [id, flags.trainings]);

  // Evaluations
  useEffect(() => {
    if (!id || !flags.evaluations || athleteIds.length === 0) return;
    supabase
      .from('athlete_evaluations')
      .select('fundamental, score, evaluated_at, athlete_id')
      .in('athlete_id', athleteIds)
      .order('evaluated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setEvaluations((data as Evaluation[]) ?? []));
  }, [id, flags.evaluations, athleteIds]);

  // Convocations (2-step)
  useEffect(() => {
    if (!id || !flags.convocations || athleteIds.length === 0) return;
    (async () => {
      const { data: cp } = await supabase
        .from('convocation_players')
        .select('convocation_id, athlete_id')
        .in('athlete_id', athleteIds);
      const convIds = Array.from(new Set(((cp as { convocation_id: string }[]) ?? []).map((r) => r.convocation_id)));
      if (convIds.length === 0) {
        setConvocations([]);
        return;
      }
      const { data } = await supabase
        .from('convocations')
        .select('id, title, match_date')
        .in('id', convIds)
        .order('match_date', { ascending: false })
        .limit(5);
      setConvocations((data as Convocation[]) ?? []);
    })();
  }, [id, flags.convocations, athleteIds]);

  // Attendance %
  const attendanceRate = useMemo(() => {
    if (attendances.length === 0) return null;
    const present = attendances.filter((a) => a.status === 'presente' || a.status === 'present').length;
    return Math.round((present / attendances.length) * 100);
  }, [attendances]);

  // Evaluation averages
  const evalAverages = useMemo(() => {
    const groups = new Map<string, number[]>();
    evaluations.forEach((e) => {
      if (!e.fundamental || e.score == null) return;
      if (!groups.has(e.fundamental)) groups.set(e.fundamental, []);
      groups.get(e.fundamental)!.push(e.score);
    });
    return Array.from(groups.entries()).map(([k, arr]) => ({
      fundamental: k,
      avg: arr.reduce((s, n) => s + n, 0) / arr.length,
      count: arr.length,
    }));
  }, [evaluations]);

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {teamLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <>
              <h1 className="text-4xl font-black uppercase italic tracking-tight truncate">
                {team?.name ?? 'Squadra'}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {team?.category && <Badge variant="secondary">{team.category}</Badge>}
                {team?.age_group && <Badge variant="outline">{team.age_group}</Badge>}
                {team?.season && <Badge variant="outline">{team.season}</Badge>}
                <Link
                  to="/impostazioni#squadre"
                  className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1 ml-2"
                >
                  Gestisci squadra <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Impostazioni sezioni">
              <Settings className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <p className="text-xs font-bold uppercase italic tracking-wide text-muted-foreground">
              Sezioni visibili
            </p>
            {(Object.keys(SECTION_LABELS) as (keyof SectionFlags)[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <Label htmlFor={`sec-${k}`} className="text-sm cursor-pointer">
                  {SECTION_LABELS[k]}
                </Label>
                <Switch
                  id={`sec-${k}`}
                  checked={flags[k]}
                  onCheckedChange={(v) => updateFlag(k, v)}
                />
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {allOff && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessuna sezione visibile — attivane almeno una dall'icona impostazioni
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {flags.roster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Rosa atleti</CardTitle>
          </CardHeader>
          <CardContent>
            {athletes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun atleta assegnato.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {athletes.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-8 text-center font-black text-primary">
                      {a.number ?? '—'}
                    </span>
                    <span className="flex-1 font-semibold truncate">
                      {a.last_name} {a.first_name}
                    </span>
                    {a.role && <Badge variant="outline">{a.role}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {flags.attendance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Presenze</CardTitle>
          </CardHeader>
          <CardContent>
            {athleteIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Attiva la rosa per calcolare le presenze.</p>
            ) : attendanceRate == null ? (
              <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-primary">{attendanceRate}%</span>
                <span className="text-sm text-muted-foreground">
                  su {attendances.length} registrazioni
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {flags.injuries && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Infortuni attivi</CardTitle>
          </CardHeader>
          <CardContent>
            {athleteIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Attiva la rosa per vedere gli infortuni.</p>
            ) : injuries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun infortunio in corso.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {injuries.map((i) => {
                  const a = athleteById.get(i.athlete_id);
                  return (
                    <li key={i.id} className="py-2 text-sm flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {a ? `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim() : '—'}
                      </span>
                      {i.body_part && <Badge variant="outline">{i.body_part}</Badge>}
                      {i.injury_type && <Badge variant="secondary">{i.injury_type}</Badge>}
                      {i.start_date && (
                        <span className="text-muted-foreground text-xs ml-auto">
                          dal {i.start_date}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {flags.trainings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Ultimi allenamenti</CardTitle>
          </CardHeader>
          <CardContent>
            {trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun allenamento.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {trainings.map((t) => (
                  <li key={t.id} className="py-2 text-sm flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">
                      {t.scheduled_date ?? '—'}
                    </span>
                    <span className="flex-1 font-semibold truncate">{t.title ?? 'Senza titolo'}</span>
                    {t.status && <Badge variant="outline">{t.status}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {flags.evaluations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Valutazioni (media)</CardTitle>
          </CardHeader>
          <CardContent>
            {athleteIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Attiva la rosa per vedere le valutazioni.</p>
            ) : evalAverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna valutazione recente.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {evalAverages.map((e) => (
                  <Badge key={e.fundamental} variant="secondary" className="text-sm py-1.5 px-3">
                    <span className="font-bold uppercase">{e.fundamental}</span>
                    <span className="ml-2 text-primary font-black">{e.avg.toFixed(1)}</span>
                    <span className="ml-1 text-xs opacity-60">({e.count})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {flags.convocations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase italic">Convocazioni recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {athleteIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Attiva la rosa per vedere le convocazioni.</p>
            ) : convocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna convocazione recente.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {convocations.map((c) => (
                  <li key={c.id} className="py-2 text-sm flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">
                      {c.match_date ?? '—'}
                    </span>
                    <span className="flex-1 font-semibold truncate">{c.title ?? 'Convocazione'}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
