import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type DbAction, statsBySkill, setsTimeline, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import type { MatchRow } from './types';

export function CompareTab({ actions, match, currentTeamId }: { actions: DbAction[]; match: MatchRow; currentTeamId: string }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [secondMatchId, setSecondMatchId] = useState<string>('');
  const [secondActions, setSecondActions] = useState<DbAction[]>([]);
  const [loadingSecond, setLoadingSecond] = useState(false);
  const home = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === match.home_team.id);
  const away = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === match.away_team.id);
  const homeStats = statsBySkill(home);
  const awayStats = statsBySkill(away);
  const skills = ['R','A','S','B','D'];
  const timelines = setsTimeline(actions.filter(a => a.scout_match_id === match.id));
  const currentTeamActions = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id === currentTeamId);
  const opponentActions = actions.filter(a => a.scout_match_id === match.id && a.scout_team_id !== currentTeamId);
  const selectedSecond = matches.find(m => m.id === secondMatchId);
  const secondTeamId = selectedSecond
    ? (currentTeamId === match.away_team.id ? selectedSecond.away_team.id : selectedSecond.home_team.id)
    : '';
  const secondTeamActions = secondActions.filter(a => a.scout_team_id === secondTeamId);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, venue, home_sets_won, away_sets_won, set_results, source_filename,
                 home_team:home_team_id(id,name), away_team:away_team_id(id,name)`)
        .neq('id', match.id)
        .order('match_date', { ascending: false });
      setMatches(((data ?? []) as unknown as MatchListItem[]));
    })();
  }, [match.id]);

  useEffect(() => {
    if (!secondMatchId) { setSecondActions([]); return; }
    setLoadingSecond(true);
    (async () => {
      const all: DbAction[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('scout_actions')
          .select('*')
          .eq('scout_match_id', secondMatchId)
          .order('set_number').order('rally_index').order('action_index')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        all.push(...((data ?? []) as unknown as DbAction[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setSecondActions(all);
      setLoadingSecond(false);
    })();
  }, [secondMatchId]);

  const matchCompareData = skills.map(skill => {
    const a = statsBySkill(currentTeamActions).find(x => x.skill === skill);
    const b = statsBySkill(secondTeamActions).find(x => x.skill === skill);
    const effA = a?.efficiency ?? 0;
    const effB = b?.efficiency ?? 0;
    return { skill: SKILL_NAMES[skill] || skill, effA, effB, delta: effB - effA, totalA: a?.total ?? 0, totalB: b?.total ?? 0 };
  });

  const benchmarkData = skills.map(skill => {
    const ours = statsBySkill(currentTeamActions).find(x => x.skill === skill);
    const opp = statsBySkill(opponentActions).find(x => x.skill === skill);
    return { skill: SKILL_NAMES[skill] || skill, nostra: ours?.efficiency ?? 0, avversario: opp?.efficiency ?? 0 };
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Confronto squadre</h3>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left">Skill</th>
              <th>{match.home_team.name}</th>
              <th></th>
              <th>{match.away_team.name}</th>
            </tr>
          </thead>
          <tbody>
            {skills.map(s => {
              const h = homeStats.find(x => x.skill === s);
              const a = awayStats.find(x => x.skill === s);
              return (
                <tr key={s} className="border-b border-border/40">
                  <td className="py-2 font-semibold">{SKILL_NAMES[s]}</td>
                  <td className="text-center">{h ? `${h.total} (eff ${h.efficiency.toFixed(0)}%)` : '—'}</td>
                  <td className="text-center text-muted-foreground text-xs">vs</td>
                  <td className="text-center">{a ? `${a.total} (eff ${a.efficiency.toFixed(0)}%)` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold uppercase italic">Confronto tra due partite</h3>
          <Select value={secondMatchId} onValueChange={setSecondMatchId}>
            <SelectTrigger className="w-full md:w-80"><SelectValue placeholder="Seleziona seconda gara" /></SelectTrigger>
            <SelectContent>
              {matches.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.home_team.name} vs {m.away_team.name} · {m.match_date || '—'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {secondMatchId ? (
          <div className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr><th className="text-left py-2">Fondamentale</th><th>Eff% Gara A</th><th>Eff% Gara B</th><th>Delta</th></tr>
                </thead>
                <tbody>
                  {matchCompareData.map(row => (
                    <tr key={row.skill} className="border-b border-border/40">
                      <td className="py-2 font-semibold">{row.skill}</td>
                      <td className="text-center">{row.effA.toFixed(1)}% <span className="text-xs text-muted-foreground">({row.totalA})</span></td>
                      <td className="text-center">{row.effB.toFixed(1)}% <span className="text-xs text-muted-foreground">({row.totalB})</span></td>
                      <td className={`text-center font-bold ${row.delta >= 0 ? 'text-success' : 'text-destructive'}`}>{row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-72">
              {loadingSecond ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Caricamento confronto…</div> : (
                <ResponsiveContainer>
                  <BarChart data={matchCompareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="effA" name="Gara A" fill="hsl(var(--primary))" />
                    <Bar dataKey="effB" name="Gara B" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Seleziona una seconda gara per confrontare le Eff% della squadra.</p>}
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Benchmark avversario</h3>
        <div className="h-80">
          <ResponsiveContainer>
            <RadarChart data={benchmarkData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
              <Radar name="Nostra squadra" dataKey="nostra" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
              <Radar name="Avversario" dataKey="avversario" stroke="hsl(var(--opponent))" fill="hsl(var(--opponent))" fillOpacity={0.12} />
              <Legend />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Andamento punto-punto per set</h3>
        <div className="space-y-6">
          {timelines.map(t => {
            const max = Math.max(...t.points.map(p => Math.abs(p.lead)), 5);
            const w = 100;
            return (
              <div key={t.setNumber}>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-bold uppercase italic text-sm">Set {t.setNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.points[t.points.length - 1].home}-{t.points[t.points.length - 1].away}
                  </span>
                </div>
                <svg viewBox={`0 0 ${w} 40`} className="w-full h-16 bg-muted/30 rounded">
                  <line x1="0" x2={w} y1="20" y2="20" stroke="hsl(var(--border))" strokeWidth="0.3" />
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.6"
                    points={t.points.map((p, i) => `${(i / (t.points.length - 1 || 1)) * w},${20 - (p.lead / max) * 18}`).join(' ')}
                  />
                </svg>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{match.home_team.name} avanti ↑</span>
                  <span>{match.away_team.name} avanti ↓</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
