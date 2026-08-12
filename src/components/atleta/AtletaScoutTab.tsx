import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseQuery';

interface ScoutActionRow {
  skill: string;
  evaluation: string;
  scout_match_id: string;
  scout_matches: {
    match_date: string | null;
    home_sets_won: number;
    away_sets_won: number;
    home_team_id: string;
    away_team_id: string;
  } | null;
}

interface TeamRow { id: string; name: string; is_own_team: boolean }

function pct(n: number, tot: number) { return tot > 0 ? Math.round((n / tot) * 1000) / 10 : 0; }

export function AtletaScoutTab({ number, active }: { number: number | null; active: boolean }) {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['athlete-scout-actions', number],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scout_actions')
        .select('skill, evaluation, scout_match_id, scout_matches!inner(match_date, home_sets_won, away_sets_won, home_team_id, away_team_id)')
        .eq('player_number', number!);
      if (error) { handleSupabaseError(error, 'caricamento azioni scout'); return []; }
      return (data ?? []) as unknown as ScoutActionRow[];
    },
    enabled: active && number != null,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['scout-teams-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('scout_teams').select('id, name, is_own_team');
      if (error) { handleSupabaseError(error, 'caricamento squadre'); return []; }
      return (data ?? []) as TeamRow[];
    },
    enabled: active && number != null,
  });

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const kpi = useMemo(() => {
    const bySkill = (s: string) => actions.filter(a => a.skill === s);
    const rec = bySkill('R');
    const att = bySkill('A');
    const srv = bySkill('S');
    const count = (arr: ScoutActionRow[], evals: string[]) => arr.filter(a => evals.includes(a.evaluation)).length;
    return {
      rec: {
        tot: rec.length,
        pos: pct(count(rec, ['+', '#']), rec.length),
        neg: pct(count(rec, ['=', '-']), rec.length),
        dist: ['#', '+', '!', '-', '/', '='].map(e => ({ eval: e, n: count(rec, [e]) })),
      },
      att: {
        tot: att.length,
        eff: pct(count(att, ['#']) - count(att, ['=']), att.length),
        kill: pct(count(att, ['#']), att.length),
        err: pct(count(att, ['=']), att.length),
      },
      srv: {
        tot: srv.length,
        ace: pct(count(srv, ['#']), srv.length),
        err: pct(count(srv, ['=']), srv.length),
      },
    };
  }, [actions]);

  const lastMatches = useMemo(() => {
    const m = new Map<string, { id: string; date: string | null; sets: string; opponent: string; R: number; A: number; S: number }>();
    actions.forEach(a => {
      const sm = a.scout_matches;
      if (!sm) return;
      let row = m.get(a.scout_match_id);
      if (!row) {
        const home = teamMap.get(sm.home_team_id);
        const away = teamMap.get(sm.away_team_id);
        const opponent = home?.is_own_team ? (away?.name ?? '—') : (home?.name ?? '—');
        row = {
          id: a.scout_match_id, date: sm.match_date, opponent,
          sets: `${sm.home_sets_won}-${sm.away_sets_won}`, R: 0, A: 0, S: 0,
        };
        m.set(a.scout_match_id, row);
      }
      if (a.skill === 'R') row.R++;
      if (a.skill === 'A') row.A++;
      if (a.skill === 'S') row.S++;
    });
    return Array.from(m.values())
      .sort((x, y) => (y.date ?? '').localeCompare(x.date ?? ''))
      .slice(0, 5);
  }, [actions, teamMap]);

  if (number == null) {
    return (
      <Card className="p-10 text-center">
        <BarChart2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Numero maglia non assegnato — impossibile recuperare le statistiche scout.
        </p>
      </Card>
    );
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Caricamento…</p>;

  if (actions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <BarChart2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nessuna azione scout trovata per il numero #{number}.</p>
      </Card>
    );
  }

  const maxDist = Math.max(1, ...kpi.rec.dist.map(d => d.n));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ricezione</p>
          <p className={`text-4xl font-black mt-1 ${kpi.rec.pos > 55 ? 'text-green-400' : 'text-foreground'}`}>
            {kpi.rec.pos}%
          </p>
          <p className="text-xs text-muted-foreground">positive su {kpi.rec.tot} azioni</p>
          <p className={`text-sm font-semibold mt-2 ${kpi.rec.neg > 20 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {kpi.rec.neg}% negative
          </p>
          <div className="mt-3 space-y-1">
            {kpi.rec.dist.map(d => (
              <div key={d.eval} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-mono">{d.eval}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(d.n / maxDist) * 100}%` }} />
                </div>
                <span className="tabular-nums w-6 text-right">{d.n}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attacco</p>
          <p className="text-4xl font-black mt-1">{kpi.att.eff}%</p>
          <p className="text-xs text-muted-foreground">efficienza su {kpi.att.tot} attacchi</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className={kpi.att.kill > 50 ? 'text-green-400 font-semibold' : ''}>Kill: {kpi.att.kill}%</p>
            <p className={kpi.att.err > 10 ? 'text-red-400 font-semibold' : ''}>Errori: {kpi.att.err}%</p>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Battuta</p>
          <p className={`text-4xl font-black mt-1 ${kpi.srv.ace > 8 ? 'text-green-400' : 'text-foreground'}`}>
            {kpi.srv.ace}%
          </p>
          <p className="text-xs text-muted-foreground">ace su {kpi.srv.tot} battute</p>
          <p className={`text-sm font-semibold mt-3 ${kpi.srv.err > 15 ? 'text-red-400' : 'text-muted-foreground'}`}>
            Errori: {kpi.srv.err}%
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Ultime 5 partite</p>
        <div className="space-y-2">
          {lastMatches.map(m => (
            <div key={m.id} className="flex items-center gap-3 text-sm border-b border-border/40 pb-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {m.date ? new Date(m.date).toLocaleDateString('it-IT') : '—'}
              </span>
              <span className="flex-1 truncate font-semibold">{m.opponent}</span>
              <Badge variant="outline">{m.sets}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">R {m.R} · A {m.A} · B {m.S}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
