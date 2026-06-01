import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, UserCircle, HeartPulse, Star, ClipboardCheck,
  Phone, Mail, AlertTriangle, FileText,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { downloadAthleteCard } from '@/lib/pdfReport';
import { handleSupabaseError } from '@/lib/supabaseQuery';

interface Athlete {
  id: string; number: number | null; last_name: string;
  first_name: string | null; role: string | null;
  is_libero: boolean; is_captain: boolean;
  birth_date: string | null; phone: string | null;
  email: string | null; notes: string | null;
  medical_cert_expiry: string | null;
}

interface Evaluation {
  id: string; fundamental: string; score: number;
  evaluated_at: string; season_phase: string | null;
}

interface Injury {
  id: string; body_part: string; injury_type: string | null;
  start_date: string; actual_return_date: string | null;
  expected_return_date: string | null;
  severity: string; status: string; notes: string | null;
}

interface AttendanceStat { pct: number; presenti: number; totali: number; }

export default function AtletaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { societyId } = useActiveSociety();

  const { data: athlete, isLoading } = useQuery({
    queryKey: queryKeys.athletes.detail(id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes').select('*').eq('id', id!).single();
      if (error) { handleSupabaseError(error, 'caricamento atleti'); throw error; }
      return data as Athlete;
    },
    enabled: !!id,
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ['evaluations', 'athlete', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_evaluations')
        .select('id, fundamental, score, evaluated_at, season_phase')
        .eq('athlete_id', id!)
        .order('evaluated_at', { ascending: false });
      if (error) { handleSupabaseError(error); return []; }
      return (data ?? []) as Evaluation[];
    },
    enabled: !!id,
  });

  const { data: injuries = [] } = useQuery({
    queryKey: ['injuries', 'athlete', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_injuries')
        .select('id, body_part, injury_type, start_date, actual_return_date, expected_return_date, severity, status, notes')
        .eq('athlete_id', id!)
        .order('start_date', { ascending: false });
      if (error) { handleSupabaseError(error); return []; }
      return (data ?? []) as Injury[];
    },
    enabled: !!id,
  });

  const { data: attendanceStat } = useQuery({
    queryKey: ['attendances', 'athlete', id, societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances').select('status')
        .eq('athlete_id', id!).eq('society_id', societyId!);
      if (error) { handleSupabaseError(error, 'caricamento presenze'); return null; }
      const rows = data ?? [];
      const presenti = rows.filter(r => r.status === 'presente').length;
      return {
        pct: rows.length > 0 ? Math.round((presenti / rows.length) * 100) : 0,
        presenti, totali: rows.length,
      } as AttendanceStat;
    },
    enabled: !!id && !!societyId,
  });

  const latestByFundamental = useMemo(() => {
    const map = new Map<string, Evaluation>();
    evaluations.forEach(e => { if (!map.has(e.fundamental)) map.set(e.fundamental, e); });
    return Array.from(map.values());
  }, [evaluations]);

  const scoreColor = (s: number) =>
    s >= 4 ? 'text-green-400' : s >= 3 ? 'text-yellow-400' : 'text-red-400';

  const activeInjuries = injuries.filter(i => i.status === 'attivo');

  if (isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="container py-10 text-center">
        <p className="text-muted-foreground">Atleta non trovata.</p>
        <Button onClick={() => navigate('/atleti')} className="mt-4">
          ← Torna alle atleti
        </Button>
      </div>
    );
  }

  const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

  const certStatus = () => {
    if (!athlete.medical_cert_expiry) return null;
    const days = Math.floor(
      (new Date(athlete.medical_cert_expiry).getTime() - Date.now()) / 86400000,
    );
    if (days < 0) return <Badge variant="destructive">⚠️ Cert. scaduto</Badge>;
    if (days <= 30) return <Badge variant="outline" className="border-warning text-warning">⏰ Scade tra {days}gg</Badge>;
    return <Badge variant="outline" className="border-green-600 text-green-500">✅ Cert. ok</Badge>;
  };

  const handlePdf = async () => {
    try {
      downloadAthleteCard({
        firstName: athlete.first_name,
        lastName: athlete.last_name,
        number: athlete.number,
        role: athlete.role,
        birthDate: athlete.birth_date,
        email: athlete.email,
        phone: athlete.phone,
        team: null,
        isLibero: athlete.is_libero,
        isCaptain: athlete.is_captain,
        medicalCertExpiry: athlete.medical_cert_expiry,
        notes: athlete.notes,
        attendancePct: attendanceStat?.pct ?? null,
        presences: attendanceStat?.presenti,
        totalEvents: attendanceStat?.totali,
        evaluations: latestByFundamental.map(e => ({
          fundamental: e.fundamental, score: e.score, date: e.evaluated_at,
        })),
        injuries: injuries.map(i => ({
          bodyPart: i.body_part, severity: i.severity, status: i.status, startDate: i.start_date,
        })),
        societyName: null,
      });
    } catch (e) {
      handleSupabaseError(e, 'export PDF');
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/atleti')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-black text-primary">
            {athlete.number != null ? `#${athlete.number}` : '—'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">
            {athlete.last_name}
            {athlete.first_name ? ` ${athlete.first_name}` : ''}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {athlete.role && <Badge variant="outline">{athlete.role}</Badge>}
            {athlete.is_captain && <Badge>Capitano</Badge>}
            {athlete.is_libero && <Badge variant="secondary">Libero</Badge>}
            {activeInjuries.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <HeartPulse className="w-3 h-3" /> Infortunata
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handlePdf}>
          <FileText className="w-4 h-4" /> PDF
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="info" className="gap-2"><UserCircle className="w-4 h-4" />Info</TabsTrigger>
          <TabsTrigger value="evals" className="gap-2"><Star className="w-4 h-4" />Valutazioni</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><ClipboardCheck className="w-4 h-4" />Presenze</TabsTrigger>
          <TabsTrigger value="injuries" className="gap-2">
            <HeartPulse className="w-4 h-4" />Infortuni
            {activeInjuries.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                {activeInjuries.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* INFO */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Data di nascita', value: athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString('it-IT') : '—' },
              { label: 'Ruolo', value: athlete.role || '—' },
            ].map(({ label, value }) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {athlete.phone && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefono</p>
                <a href={waLink(athlete.phone)} target="_blank" rel="noopener noreferrer"
                  className="font-semibold mt-1 inline-flex items-center gap-1 text-green-400 hover:text-green-300">
                  <Phone className="w-4 h-4" /> {athlete.phone}
                </a>
              </Card>
            )}
            {athlete.email && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <a href={`mailto:${athlete.email}`}
                  className="font-semibold mt-1 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  <Mail className="w-4 h-4" /> {athlete.email}
                </a>
              </Card>
            )}
          </div>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificato medico</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="font-semibold">
                {athlete.medical_cert_expiry
                  ? new Date(athlete.medical_cert_expiry).toLocaleDateString('it-IT') : '—'}
              </p>
              {certStatus()}
            </div>
          </Card>
          {athlete.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{athlete.notes}</p>
            </Card>
          )}
        </TabsContent>

        {/* VALUTAZIONI */}
        <TabsContent value="evals" className="mt-4">
          {latestByFundamental.length === 0 ? (
            <Card className="p-10 text-center">
              <Star className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Nessuna valutazione registrata.</p>
              <Link to="/valutazioni" className="text-primary hover:underline text-sm">
                Vai a Valutazioni →
              </Link>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {latestByFundamental.map(e => (
                  <Card key={e.id} className="p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{e.fundamental}</p>
                    <p className={`text-3xl font-black mt-2 ${scoreColor(e.score)}`}>{e.score}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(e.evaluated_at).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })}
                    </p>
                  </Card>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link to="/valutazioni" className="text-primary hover:underline text-sm">
                  Vedi valutazioni complete →
                </Link>
              </div>
            </>
          )}
        </TabsContent>

        {/* PRESENZE */}
        <TabsContent value="attendance" className="mt-4">
          {!attendanceStat || attendanceStat.totali === 0 ? (
            <Card className="p-10 text-center">
              <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Nessuna presenza registrata.</p>
              <Link to="/presenze" className="text-primary hover:underline text-sm">
                Vai a Presenze →
              </Link>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Stagione corrente
              </p>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className={`text-5xl font-black ${attendanceStat.pct >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {attendanceStat.pct}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {attendanceStat.presenti} presenze su {attendanceStat.totali} eventi
                  </p>
                </div>
                {attendanceStat.pct < 70 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Sotto soglia 70%
                  </Badge>
                )}
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${attendanceStat.pct >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${attendanceStat.pct}%` }}
                />
              </div>
              <div className="mt-4">
                <Link to="/presenze" className="text-primary hover:underline text-sm">
                  Vedi dettaglio presenze →
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* INFORTUNI */}
        <TabsContent value="injuries" className="mt-4 space-y-3">
          {injuries.length === 0 ? (
            <Card className="p-10 text-center">
              <HeartPulse className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nessun infortunio registrato.</p>
            </Card>
          ) : (
            injuries.map(inj => (
              <Card key={inj.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {inj.body_part}
                      {inj.injury_type ? ` — ${inj.injury_type}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(inj.start_date).toLocaleDateString('it-IT')}
                      {inj.actual_return_date && ` → ${new Date(inj.actual_return_date).toLocaleDateString('it-IT')}`}
                      {!inj.actual_return_date && inj.expected_return_date &&
                        ` (rientro previsto ${new Date(inj.expected_return_date).toLocaleDateString('it-IT')})`}
                    </p>
                    {inj.notes && <p className="text-sm mt-2">{inj.notes}</p>}
                  </div>
                  <Badge variant={inj.status === 'attivo' ? 'destructive' : 'outline'}>
                    {inj.status}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
