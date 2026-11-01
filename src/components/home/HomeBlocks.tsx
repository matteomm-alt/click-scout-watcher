import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Trophy, Dumbbell, AlertTriangle, MapPin, TrendingUp, BarChart3, Target, HeartPulse,
  Activity, FileUp, Library, ShieldAlert, MailPlus, SlidersHorizontal, ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/hooks/usePreferences';
import { queryKeys } from '@/lib/queryKeys';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { BLOCKS, type BlockDef } from '@/lib/navConfig';
import { CARD_BY_ID, type HomeCardId } from '@/lib/homeLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

/* ────────────────────────── utilità ────────────────────────── */

const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const daysBetween = (isoDay: string) =>
  Math.round((new Date(`${isoDay}T00:00:00`).getTime() - new Date(`${localDay()}T00:00:00`).getTime()) / 86400000);

/* ────────────────────────── guscio card ────────────────────────── */

function HomeCard({
  block, icon: Icon, title, to, linkLabel = 'Apri →', children,
}: {
  block: BlockDef;
  icon: LucideIcon;
  title: string;
  to?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const interactive = to
    ? {
        role: 'link' as const,
        tabIndex: 0,
        onClick: () => navigate(to),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate(to);
          }
        },
      }
    : {};
  return (
    <Card
      {...interactive}
      className={`p-4 flex flex-col gap-3 min-h-[148px] ${
        to ? `cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs uppercase tracking-widest font-bold flex items-center gap-2 ${block.text}`}>
          <Icon className="w-3.5 h-3.5" /> {title}
        </p>
        {to && (
          <Link
            to={to}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-orange-700 dark:text-primary font-bold hover:underline shrink-0"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

function Row({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 text-sm">
      <span className="font-medium truncate">{left}</span>
      <span className="text-xs text-muted-foreground shrink-0">{right}</span>
    </div>
  );
}

function LinkCard({ block, icon, title, to, text, cta }: {
  block: BlockDef; icon: LucideIcon; title: string; to: string; text: string; cta: string;
}) {
  return (
    <HomeCard block={block} icon={icon} title={title} to={to} linkLabel="">
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      <Button asChild size="sm" variant="outline" className="font-bold">
        <span>{cta}</span>
      </Button>
    </HomeCard>
  );
}

/* ────────────────────────── dati condivisi ────────────────────────── */

interface DvwKpi {
  total: number;
  wins: number;
  winRate: number;
  lastResult: { won: boolean; opponent: string; date: string | null } | null;
  lastMatchId: string | null;
}

function useDvwKpi() {
  const { user } = useAuth();
  return useQuery<DvwKpi>({
    queryKey: queryKeys.dashboard.matches(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scout_matches')
        .select('id, home_sets_won, away_sets_won, match_date, away_team:away_team_id(name), home_team:home_team_id(name)')
        .eq('coach_id', user!.id)
        .order('match_date', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; home_sets_won: number; away_sets_won: number; match_date: string | null;
        away_team?: { name?: string } | null; home_team?: { name?: string } | null;
      }>;
      const total = rows.length;
      const wins = rows.filter((m) => m.home_sets_won > m.away_sets_won).length;
      const last = rows[0];
      return {
        total,
        wins,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        lastResult: last
          ? { won: last.home_sets_won > last.away_sets_won, opponent: last.away_team?.name ?? '—', date: last.match_date }
          : null,
        lastMatchId: last?.id ?? null,
      };
    },
    enabled: !!user?.id,
  });
}

/* ────────────────────────── card: TECNICA ────────────────────────── */

function NextTrainingCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['home', 'next-training', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('id, title, scheduled_date, goal')
        .eq('society_id', societyId)
        .eq('is_template', false)
        .gte('scheduled_date', localDay())
        .order('scheduled_date', { ascending: true })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 2 * 60 * 1000,
  });
  return (
    <HomeCard block={block} icon={Dumbbell} title="Prossimo allenamento" to={data ? `/allenamenti/${data.id}` : '/allenamenti'}>
      {isLoading ? <Skeleton className="h-12" /> : !data ? <Empty>Nessun allenamento in programma.</Empty> : (
        <>
          <p className="text-lg font-black italic uppercase leading-tight truncate">{data.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmtDate(data.scheduled_date)}
            {data.scheduled_date && (() => {
              const n = daysBetween(data.scheduled_date);
              return n === 0 ? ' · oggi' : n === 1 ? ' · domani' : ` · tra ${n} giorni`;
            })()}
          </p>
          {data.goal && <p className="text-xs mt-2 line-clamp-2">{data.goal}</p>}
        </>
      )}
    </HomeCard>
  );
}

function RecentTrainingsCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: [...queryKeys.dashboard.trainings(societyId), 'past'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('id, title, scheduled_date')
        .eq('society_id', societyId)
        .eq('is_template', false)
        .lte('scheduled_date', localDay())
        .order('scheduled_date', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <HomeCard block={block} icon={Dumbbell} title="Ultimi allenamenti" to="/allenamenti" linkLabel="Tutti →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Nessun allenamento registrato.</Empty> : (
        data.map((t) => <Row key={t.id} left={t.title} right={fmtDate(t.scheduled_date)} />)
      )}
    </HomeCard>
  );
}

const OBJ_LABEL: Record<string, string> = { aperto: 'Aperto', in_corso: 'In corso' };

function ObjectivesCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['home', 'objectives', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('id, title, status, target_date')
        .eq('society_id', societyId)
        .neq('status', 'completato')
        .order('target_date', { ascending: true, nullsFirst: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
  return (
    <HomeCard block={block} icon={Target} title="Obiettivi in corso" to="/obiettivi" linkLabel="Tutti →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Nessun obiettivo aperto.</Empty> : (
        data.map((o) => (
          <Row
            key={o.id}
            left={o.title}
            right={<Badge variant="outline" className="text-xs">{OBJ_LABEL[o.status] ?? o.status}</Badge>}
          />
        ))
      )}
    </HomeCard>
  );
}

const SEV_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  grave: 'destructive', media: 'secondary', lieve: 'outline',
};

function InjuriesCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['home', 'injuries', societyId],
    queryFn: async () => {
      const { data: inj, error } = await supabase
        .from('athlete_injuries')
        .select('id, athlete_id, body_part, severity, status, expected_return_date')
        .eq('society_id', societyId)
        .in('status', ['attivo', 'in_recupero'])
        .order('start_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      const ids = [...new Set((inj ?? []).map((i) => i.athlete_id))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: ath } = await supabase.from('athletes').select('id, first_name, last_name').in('id', ids);
        (ath ?? []).forEach((a) => names.set(a.id, `${a.last_name}${a.first_name ? ' ' + a.first_name : ''}`));
      }
      return (inj ?? []).map((i) => ({ ...i, name: names.get(i.athlete_id) ?? '—' }));
    },
    staleTime: 2 * 60 * 1000,
  });
  return (
    <HomeCard block={block} icon={HeartPulse} title="Infortuni attivi" to="/infortuni" linkLabel="Tutti →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Nessun infortunio attivo. 👍</Empty> : (
        data.map((i) => (
          <Row
            key={i.id}
            left={`${i.name} · ${i.body_part}`}
            right={<Badge variant={SEV_VARIANT[i.severity] ?? 'outline'} className="text-xs">{i.severity}</Badge>}
          />
        ))
      )}
    </HomeCard>
  );
}

/* ────────────────────────── card: SCOUTING ────────────────────────── */

function LastMatchCard({ block }: { block: BlockDef }) {
  const { data: dvw, isLoading } = useDvwKpi();
  return (
    <HomeCard block={block} icon={Trophy} title="Ultima partita" to={dvw?.lastMatchId ? `/match/${dvw.lastMatchId}` : '/archive'} linkLabel="Analizza →">
      {isLoading ? <Skeleton className="h-12" /> : !dvw?.lastResult ? <Empty>Nessuna partita analizzata.</Empty> : (
        <div className="text-left">
          <p className={`text-4xl font-black leading-none ${dvw.lastResult.won ? 'text-primary' : 'text-destructive'}`}>
            {dvw.lastResult.won ? 'V' : 'P'}
          </p>
          <p className="text-sm mt-2 truncate">vs {dvw.lastResult.opponent || '—'}</p>
          <p className="text-xs text-muted-foreground">{fmtDate(dvw.lastResult.date)}</p>
        </div>
      )}
    </HomeCard>
  );
}

function KpiCard({ block }: { block: BlockDef }) {
  const { data: dvw, isLoading } = useDvwKpi();
  return (
    <HomeCard block={block} icon={TrendingUp} title="KPI stagione" to="/report-stagione" linkLabel="Report →">
      {isLoading || !dvw ? <Skeleton className="h-12" /> : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-black">{dvw.total}</p><p className="text-xs uppercase tracking-widest text-muted-foreground">Partite</p></div>
          <div><p className="text-2xl font-black text-orange-700 dark:text-primary">{dvw.wins}</p><p className="text-xs uppercase tracking-widest text-muted-foreground">Vittorie</p></div>
          <div><p className="text-2xl font-black">{dvw.winRate}<span className="text-sm">%</span></p><p className="text-xs uppercase tracking-widest text-muted-foreground">Win rate</p></div>
        </div>
      )}
    </HomeCard>
  );
}

/* ────────────────────────── card: GESTIONALE ────────────────────────── */

function NextEventCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['home', 'upcoming-events', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_at, location, event_type')
        .eq('society_id', societyId)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
  const first = data[0];
  return (
    <HomeCard block={block} icon={Calendar} title="Prossimi eventi" to="/calendario" linkLabel="Calendario →">
      {isLoading ? <Skeleton className="h-12" /> : !first ? <Empty>Nessun evento programmato.</Empty> : (
        <>
          <p className="text-lg font-black italic uppercase leading-tight truncate">{first.title}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {new Date(first.start_at).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {first.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{first.location}</span>}
          </p>
          {data.slice(1).map((e) => (
            <Row key={e.id} left={e.title} right={new Date(e.start_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} />
          ))}
        </>
      )}
    </HomeCard>
  );
}

function AttendanceAlertsCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboard.attendance(societyId),
    queryFn: async () => {
      const [aRes, attRes] = await Promise.all([
        supabase.from('athletes').select('id, last_name, first_name').eq('society_id', societyId),
        supabase.from('attendances').select('athlete_id, status').eq('society_id', societyId),
      ]);
      if (aRes.error) throw aRes.error;
      if (attRes.error) throw attRes.error;
      const by = new Map<string, { presente: number; total: number }>();
      (attRes.data ?? []).forEach((a) => {
        const cur = by.get(a.athlete_id) ?? { presente: 0, total: 0 };
        cur.total += 1;
        if (a.status === 'presente') cur.presente += 1;
        by.set(a.athlete_id, cur);
      });
      return (aRes.data ?? [])
        .map((ath) => {
          const st = by.get(ath.id);
          if (!st || st.total < 3) return null;
          const pct = Math.round((st.presente / st.total) * 100);
          if (pct >= 70) return null;
          return { athleteId: ath.id, name: `${ath.last_name}${ath.first_name ? ' ' + ath.first_name : ''}`, pct, total: st.total };
        })
        .filter((x): x is { athleteId: string; name: string; pct: number; total: number } => x !== null)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 5);
    },
  });
  return (
    <HomeCard block={block} icon={AlertTriangle} title="Allerte presenze" to="/presenze" linkLabel="Gestisci →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Tutti gli atleti sopra il 70% di presenze. 👍</Empty> : (
        data.map((a) => (
          <Row key={a.athleteId} left={a.name} right={<Badge variant="destructive" className="text-xs px-1.5">{a.pct}%</Badge>} />
        ))
      )}
    </HomeCard>
  );
}

function CertificatesCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['home', 'certificates', societyId],
    queryFn: async () => {
      const limit = new Date();
      limit.setDate(limit.getDate() + 30);
      const { data, error } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, medical_cert_expiry')
        .eq('society_id', societyId)
        .not('medical_cert_expiry', 'is', null)
        .lte('medical_cert_expiry', localDay(limit))
        .order('medical_cert_expiry', { ascending: true })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return (
    <HomeCard block={block} icon={ShieldAlert} title="Certificati in scadenza" to="/atleti" linkLabel="Atleti →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Nessun certificato scaduto o in scadenza a 30 giorni.</Empty> : (
        data.map((a) => {
          const n = a.medical_cert_expiry ? daysBetween(a.medical_cert_expiry) : 0;
          return (
            <Row
              key={a.id}
              left={`${a.last_name}${a.first_name ? ' ' + a.first_name : ''}`}
              right={n < 0
                ? <Badge variant="destructive" className="text-xs">scaduto</Badge>
                : <span>{fmtDate(a.medical_cert_expiry)}</span>}
            />
          );
        })
      )}
    </HomeCard>
  );
}

function PendingInvitesCard({ block, societyId }: { block: BlockDef; societyId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['home', 'pending-invites', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('society_invitations')
        .select('id, email, expires_at')
        .eq('society_id', societyId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
  return (
    <HomeCard block={block} icon={MailPlus} title="Inviti pendenti" to="/impostazioni" linkLabel="Gestisci →">
      {isLoading ? <Skeleton className="h-12" /> : data.length === 0 ? <Empty>Nessun invito in attesa.</Empty> : (
        data.map((i) => <Row key={i.id} left={i.email} right={`scade ${fmtDate(i.expires_at)}`} />)
      )}
    </HomeCard>
  );
}

/* ────────────────────────── mappa id → card ────────────────────────── */

function renderCard(id: HomeCardId, societyId: string) {
  const block = BLOCKS[CARD_BY_ID[id].block];
  switch (id) {
    case 'next_training': return <NextTrainingCard block={block} societyId={societyId} />;
    case 'recent_trainings': return <RecentTrainingsCard block={block} societyId={societyId} />;
    case 'objectives': return <ObjectivesCard block={block} societyId={societyId} />;
    case 'injuries': return <InjuriesCard block={block} societyId={societyId} />;
    case 'last_match': return <LastMatchCard block={block} />;
    case 'kpi_dvw': return <KpiCard block={block} />;
    case 'scout_live':
      return <LinkCard block={block} icon={Activity} title="Scout Live" to="/scout" text="Registra le azioni di una partita in corso." cta="Avvia scouting" />;
    case 'import_dvw':
      return <LinkCard block={block} icon={FileUp} title="Importa DVW" to="/import" text="Carica un file .dvw per heatmap, statistiche e rotazioni." cta="Importa file" />;
    case 'archive':
      return <LinkCard block={block} icon={Library} title="Archivio" to="/archive" text="Squadre e partite importate in precedenza." cta="Apri archivio" />;
    case 'season_report':
      return <LinkCard block={block} icon={BarChart3} title="Report Stagione" to="/report-stagione" text="Statistiche complete e PDF esportabile." cta="Apri report" />;
    case 'next_event': return <NextEventCard block={block} societyId={societyId} />;
    case 'attendance_alerts': return <AttendanceAlertsCard block={block} societyId={societyId} />;
    case 'certificates': return <CertificatesCard block={block} societyId={societyId} />;
    case 'pending_invites': return <PendingInvitesCard block={block} societyId={societyId} />;
  }
}

/* ────────────────────────── blocchi ────────────────────────── */

function BlockSection({ block, cardIds, max, societyId }: {
  block: BlockDef; cardIds: HomeCardId[]; max: number; societyId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? cardIds : cardIds.slice(0, max);
  const hidden = cardIds.length - max;

  return (
    <section className={`rounded-2xl border ${block.border} ${block.bg} p-4 md:p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${block.dot}`} />
          <h3 className={`text-xl md:text-2xl font-black italic uppercase leading-none ${block.text}`}>{block.label}</h3>
        </div>
        {hidden > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="text-xs font-bold">
            {expanded ? <>Mostra meno <ChevronUp className="w-3.5 h-3.5 ml-1" /></> : <>Mostra altre ({hidden}) <ChevronDown className="w-3.5 h-3.5 ml-1" /></>}
          </Button>
        )}
      </div>
      {cardIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna card selezionata per questo blocco.{' '}
          <Link to="/personalizza" className="text-orange-700 dark:text-primary font-bold hover:underline">Personalizza</Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {shown.map((id) => <div key={id} className="min-w-0">{renderCard(id, societyId)}</div>)}
        </div>
      )}
    </section>
  );
}

export function HomeBlocks() {
  const { societyId, isAdmin, features, loading } = useActiveSociety();
  const { prefs } = usePreferences();

  if (loading) {
    return (
      <section className="container pb-16 space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }
  if (!societyId) return null;

  const blocks = prefs.blockOrder
    .filter((b) => !prefs.hiddenBlocks.includes(b))
    .map((b) => ({
      block: BLOCKS[b],
      max: prefs.home[b].max,
      cardIds: prefs.home[b].cards.filter((id) => {
        const def = CARD_BY_ID[id];
        return (!def.feature || isFeatureEnabled(features, def.feature)) && (!def.adminOnly || isAdmin);
      }),
    }));

  return (
    <section className="container pb-16 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h3 className="text-xl sm:text-2xl font-black italic uppercase leading-none">Panoramica</h3>
        <Link to="/personalizza">
          <Button variant="outline" size="sm" className="font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-2" /> Personalizza
          </Button>
        </Link>
      </div>

      {blocks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Tutti i blocchi sono nascosti.{' '}
          <Link to="/personalizza" className="text-orange-700 dark:text-primary font-bold hover:underline">Riattivali da Personalizza</Link>
        </Card>
      ) : (
        blocks.map((b) => (
          <BlockSection key={b.block.id} block={b.block} cardIds={b.cardIds} max={b.max} societyId={societyId} />
        ))
      )}
    </section>
  );
}
