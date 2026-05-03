import { useEffect, useMemo, useState } from 'react';
import {
  type DbAction, SKILL_NAMES, EVAL_NAMES, EVAL_COLORS,
  statsBySkill, statsByPlayer, rotationOf,
} from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  ZAxis, ReferenceLine,
} from 'recharts';

interface Props {
  actions: DbAction[];
  playerNames: Map<number, string>;
}

const COLORS = ['#2563EB','#16A34A','#DC2626','#D97706','#7C3AED','#0891B2','#BE185D'];
const TOOLTIP = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12, borderRadius: 8, padding: '10px 14px' };

// Zone layout campo (9 zone FIVB, disposizione visiva 3x3)
const ZONE_LAYOUT = [4, 3, 2, 7, 8, 9, 5, 6, 1]; // top-left → bottom-right
const ZONE_LABELS: Record<number, string> = {
  1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5', 6: 'P6',
  7: 'DP4', 8: 'DP6', 9: 'DP2',
};

export function ChartsTab({ actions, playerNames }: Props) {
  const [section, setSection] = useState<'overview' | 'players' | 'sets' | 'radar' | 'trend' | 'heatmap' | 'setter'>('overview');

  // ── Dati skill ────────────────────────────────────────────────────
  const skillData = useMemo(() => statsBySkill(actions).map(s => ({
    name: SKILL_NAMES[s.skill] || s.skill, short: s.skill,
    Totale: s.total, Perfetti: s.perfect, Errori: s.errors,
    Eff: Math.round(s.efficiency), Pos: Math.round(s.positivePct), ErrPct: Math.round(s.errorPct),
  })), [actions]);

  const radarData = useMemo(() => statsBySkill(actions).map(s => ({
    subject: SKILL_NAMES[s.skill] || s.skill,
    Efficienza: Math.max(0, Math.round(s.efficiency + 50)),
    Positivi: Math.round(s.positivePct),
    Errori: Math.round(s.errorPct),
  })), [actions]);

  const evalData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of actions) counts[a.evaluation] = (counts[a.evaluation] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
      name: `${k} ${EVAL_NAMES[k] || ''}`.trim(), value: v,
      pct: Math.round(v / actions.length * 100), color: EVAL_COLORS[k] || 'hsl(var(--muted))',
    }));
  }, [actions]);

  const playerData = useMemo(() => statsByPlayer(actions).map(p => {
    const perfects = Object.values(p.bySkill).reduce((a, s) => a + s.perfect, 0);
    const errors = Object.values(p.bySkill).reduce((a, s) => a + s.errors, 0);
    const total = Object.values(p.bySkill).reduce((a, s) => a + s.total, 0);
    const name = playerNames.get(p.number) || `#${p.number}`;
    return { name: `#${p.number} ${name.split(' ')[0]}`, fullName: name, Punti: perfects, Errori: errors, Totale: total, Eff: total ? Math.round((perfects - errors) / total * 100) : 0, x: perfects, y: errors, z: total };
  }).filter(r => r.Totale > 0).sort((a, b) => b.Punti - a.Punti).slice(0, 12), [actions, playerNames]);

  const playerSkillData = useMemo(() => statsByPlayer(actions)
    .filter(p => Object.values(p.bySkill).reduce((a, s) => a + s.total, 0) >= 5)
    .slice(0, 8)
    .map(p => {
      const name = playerNames.get(p.number) || `#${p.number}`;
      const row: Record<string, any> = { name: `#${p.number} ${name.split(' ')[0]}` };
      ['R','A','S','B','D'].forEach(sk => {
        const s = p.bySkill[sk];
        row[SKILL_NAMES[sk]] = s ? Math.round(s.efficiency) : null;
      });
      return row;
    }), [actions, playerNames]);

  const setEfficienza = useMemo(() => {
    const bySet = new Map<number, DbAction[]>();
    for (const a of actions) {
      if (!bySet.has(a.set_number)) bySet.set(a.set_number, []);
      bySet.get(a.set_number)!.push(a);
    }
    return [...bySet.entries()].sort((a, b) => a[0] - b[0]).map(([set, acts]) => {
      const row: Record<string, any> = { name: `Set ${set}` };
      ['R','A','S','B','D'].forEach(sk => {
        const skActs = acts.filter(a => a.skill === sk);
        if (skActs.length > 0) {
          const perf = skActs.filter(a => a.evaluation === '#').length;
          const err = skActs.filter(a => ['=','/'].includes(a.evaluation)).length;
          row[SKILL_NAMES[sk]] = Math.round((perf - err) / skActs.length * 100);
        }
      });
      return row;
    });
  }, [actions]);

  const cumulativeData = useMemo(() => {
    const bySet = new Map<number, DbAction[]>();
    for (const a of actions) {
      if (!bySet.has(a.set_number)) bySet.set(a.set_number, []);
      bySet.get(a.set_number)!.push(a);
    }
    return [...bySet.entries()].sort((a, b) => a[0] - b[0]).map(([set, list]) => {
      let cum = 0;
      return { set, points: list.map((a, i) => { if (a.evaluation === '#') cum++; return { idx: i, value: cum }; }) };
    });
  }, [actions]);

  // ── TREND MULTI-PARTITA ───────────────────────────────────────────
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendSkill, setTrendSkill] = useState('R');

  useEffect(() => {
    if (section !== 'trend') return;
    const teamId = actions[0]?.scout_team_id;
    if (!teamId) return;
    setTrendLoading(true);
    (async () => {
      // Carico tutte le gare del team
      const { data: matches } = await supabase
        .from('scout_matches')
        .select('id, match_date, home_team_id, away_team_id, home_sets_won, away_sets_won, home_team:home_team_id(name), away_team:away_team_id(name)')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: true })
        .limit(20);

      if (!matches || matches.length === 0) { setTrendLoading(false); return; }

      const rows: any[] = [];
      for (const m of matches as any[]) {
        const side = m.home_team_id === teamId ? 'home' : 'away';
        const { data: acts } = await supabase
          .from('scout_actions')
          .select('skill, evaluation, scout_team_id')
          .eq('scout_match_id', m.id)
          .eq('scout_team_id', teamId);

        if (!acts || acts.length === 0) continue;
        const opponent = side === 'home' ? m.away_team?.name : m.home_team?.name;
        const won = side === 'home' ? m.home_sets_won > m.away_sets_won : m.away_sets_won > m.home_sets_won;
        const row: Record<string, any> = {
          name: m.match_date ? m.match_date.slice(5) : '?',
          date: m.match_date,
          opponent,
          won,
        };
        ['R','A','S','B','D'].forEach(sk => {
          const skActs = (acts as any[]).filter((a: any) => a.skill === sk);
          if (skActs.length >= 3) {
            const perf = skActs.filter((a: any) => a.evaluation === '#').length;
            const err = skActs.filter((a: any) => ['=','/'].includes(a.evaluation)).length;
            row[SKILL_NAMES[sk]] = Math.round((perf - err) / skActs.length * 100);
          }
        });
        rows.push(row);
      }
      setTrendData(rows);
      setTrendLoading(false);
    })();
  }, [section, actions]);

  // ── HEATMAP ATTACCO PER ROTAZIONE ─────────────────────────────────
  const [heatmapRot, setHeatmapRot] = useState<number>(1);

  const attackByRotation = useMemo(() => {
    const result: Record<number, Record<number, { tot: number; perf: number; err: number }>> = {};
    for (let r = 1; r <= 6; r++) {
      result[r] = {};
      for (let z = 1; z <= 9; z++) result[r][z] = { tot: 0, perf: 0, err: 0 };
    }
    actions.filter(a => a.skill === 'A' && a.end_zone).forEach(a => {
      const rot = rotationOf(a, a.side);
      if (!rot || rot < 1 || rot > 6) return;
      const z = a.end_zone!;
      if (z < 1 || z > 9) return;
      result[rot][z].tot++;
      if (a.evaluation === '#') result[rot][z].perf++;
      if (['=','/'].includes(a.evaluation)) result[rot][z].err++;
    });
    return result;
  }, [actions]);

  const currentRotZones = attackByRotation[heatmapRot] || {};
  const maxZoneTot = Math.max(1, ...Object.values(currentRotZones).map(z => z.tot));

  // ── ALZATA PER ZONA ───────────────────────────────────────────────
  const [setterFromZone, setSetterFromZone] = useState<number | null>(null);

  const setterData = useMemo(() => {
    const setterActs = actions.filter(a => a.skill === 'E' && a.start_zone && a.end_zone);
    // Da zona → verso zona: conteggio
    const fromZones = new Set(setterActs.map(a => a.start_zone!));
    const result: Record<number, Record<number, { tot: number; perf: number; err: number }>> = {};
    fromZones.forEach(fz => {
      result[fz] = {};
      for (let z = 1; z <= 9; z++) result[fz][z] = { tot: 0, perf: 0, err: 0 };
    });
    setterActs.forEach(a => {
      const fz = a.start_zone!;
      const tz = a.end_zone!;
      if (!result[fz] || tz < 1 || tz > 9) return;
      result[fz][tz].tot++;
      if (a.evaluation === '#') result[fz][tz].perf++;
      if (['=','/'].includes(a.evaluation)) result[fz][tz].err++;
    });
    return result;
  }, [actions]);

  const setterFromZones = Object.keys(setterData).map(Number).sort((a, b) => a - b);
  const activeSetterZone = setterFromZone ?? setterFromZones[0] ?? null;
  const currentSetterZones = activeSetterZone ? setterData[activeSetterZone] || {} : {};
  const maxSetterTot = Math.max(1, ...Object.values(currentSetterZones).map(z => z.tot));

  if (actions.length === 0) {
    return <Card className="p-12 text-center text-muted-foreground">Nessun dato per i filtri selezionati.</Card>;
  }

  const SECTIONS = [
    { id: 'overview', label: 'Panoramica' },
    { id: 'players', label: 'Giocatori' },
    { id: 'sets', label: 'Per Set' },
    { id: 'radar', label: 'Radar' },
    { id: 'trend', label: 'Trend Stagione' },
    { id: 'heatmap', label: 'Attacco × Rotaz.' },
    { id: 'setter', label: 'Alzata × Zona' },
  ] as const;

  // Helper zona heatmap
  const ZoneCell = ({ zone, data, maxTot, showEff = true }: { zone: number; data: { tot: number; perf: number; err: number }; maxTot: number; showEff?: boolean }) => {
    const intensity = data.tot / maxTot;
    const eff = data.tot ? Math.round((data.perf - data.err) / data.tot * 100) : 0;
    const effColor = eff >= 30 ? '#1D9E75' : eff >= 0 ? '#BA7517' : '#D85A30';
    return (
      <div className="aspect-square border border-border rounded flex flex-col items-center justify-center relative text-center"
        style={{ background: `hsl(var(--primary) / ${0.05 + intensity * 0.55})` }}>
        <span className="absolute top-1 left-1 text-[9px] text-muted-foreground">{ZONE_LABELS[zone]}</span>
        <span className="text-xl font-black italic">{data.tot || '—'}</span>
        {data.tot > 0 && showEff && <span className="text-[10px] font-semibold" style={{ color: effColor }}>{eff > 0 ? '+' : ''}{eff}%</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Navigazione */}
      <div className="flex gap-1 flex-wrap">
        {SECTIONS.map(s => (
          <Button key={s.id} size="sm" variant={section === s.id ? 'default' : 'outline'}
            onClick={() => setSection(s.id as any)}>
            {s.label}
          </Button>
        ))}
      </div>

      {/* PANORAMICA */}
      {section === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Azioni per fondamentale</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={skillData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Totale" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                  <Bar dataKey="Perfetti" fill="#1D9E75" radius={[3,3,0,0]} />
                  <Bar dataKey="Errori" fill="hsl(var(--destructive))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Ripartizione valutazioni</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={evalData} dataKey="value" nameKey="name" outerRadius={80}
                    label={({ pct }) => `${pct}%`} labelLine={false}>
                    {evalData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [`${v} azioni`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <h3 className="text-sm font-bold uppercase italic mb-4">Efficienza % per fondamentale</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={skillData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="Pos" name="Positivi%" fill="#1D9E75" radius={[3,3,0,0]} />
                  <Bar dataKey="ErrPct" name="Errori%" fill="hsl(var(--destructive))" radius={[3,3,0,0]} />
                  <Bar dataKey="Eff" name="Efficienza%" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* GIOCATORI */}
      {section === 'players' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Top performer — punti vs errori</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={playerData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={130} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Punti" fill="#1D9E75" radius={[0,3,3,0]} />
                  <Bar dataKey="Errori" fill="hsl(var(--destructive))" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-1">Scatter — punti vs errori</h3>
            <p className="text-xs text-muted-foreground mb-4">Bolla = volume azioni. In alto a sinistra = migliore.</p>
            <div className="h-64">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="x" name="Punti" type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Punti diretti', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="y" name="Errori" type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Errori', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <ZAxis dataKey="z" range={[40, 400]} name="Volume" />
                  <Tooltip contentStyle={TOOLTIP}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '8px 12px', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                          <p style={{ fontWeight: 600 }}>{d?.name}</p>
                          <p>Punti: {d?.x} · Errori: {d?.y} · Tot: {d?.z}</p>
                          <p>Eff: {d?.Eff}%</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={playerData} fill="hsl(var(--primary))" fillOpacity={0.85} stroke="hsl(var(--border))" strokeWidth={1} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {playerSkillData.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold uppercase italic mb-4">Efficienza per fondamentale per atleta</h3>
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={playerSkillData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={130} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => v !== null ? [`${v}%`] : ['—']} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" />
                    {['Ricezione','Attacco','Battuta','Muro','Difesa'].map((sk, i) => (
                      <Bar key={sk} dataKey={sk} fill={COLORS[i]} radius={[0,3,3,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* PER SET */}
      {section === 'sets' && (
        <div className="space-y-6">
          {setEfficienza.length > 1 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold uppercase italic mb-4">Efficienza % per fondamentale per set</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={setEfficienza}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => v !== null ? [`${v}%`] : ['—']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    {['Ricezione','Attacco','Battuta','Muro','Difesa'].map((sk, i) => (
                      <Line key={sk} type="monotone" dataKey={sk} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Punti diretti cumulativi per set</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="idx" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Azioni', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {cumulativeData.map((s, i) => (
                    <Line key={s.set} data={s.points} dataKey="value" name={`Set ${s.set}`}
                      type="monotone" stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* RADAR */}
      {section === 'radar' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Profilo fondamentali — efficienza</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar name="Efficienza" dataKey="Efficienza" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase italic mb-4">Positivi% vs Errori%</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar name="Positivi%" dataKey="Positivi" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Errori%" dataKey="Errori" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* TREND STAGIONE */}
      {section === 'trend' && (
        <div className="space-y-4">
          <div className="flex gap-1 flex-wrap">
            {['R','A','S','B','D'].map(sk => (
              <Button key={sk} size="sm" variant={trendSkill === sk ? 'default' : 'outline'}
                onClick={() => setTrendSkill(sk)}>
                {SKILL_NAMES[sk]}
              </Button>
            ))}
          </div>
          {trendLoading ? (
            <Card className="p-8 text-center text-muted-foreground">Caricamento storico gare...</Card>
          ) : trendData.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nessun dato storico disponibile.</Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase italic mb-1">Trend efficienza stagionale</h3>
                <p className="text-xs text-muted-foreground mb-4">Barre verdi = vittoria · Barre rosse = sconfitta</p>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={trendData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" domain={['auto', 'auto']} />
                      <Tooltip contentStyle={TOOLTIP}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '8px 12px', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                              <p style={{ fontWeight: 600 }}>{d?.opponent || label}</p>
                              <p>{d?.date}</p>
                              {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {['Ricezione','Attacco','Battuta','Muro','Difesa'].map((sk, i) => (
                        <Bar key={sk} dataKey={sk} fill={COLORS[i]}
                          opacity={sk === SKILL_NAMES[trendSkill] ? 1 : 0.3}
                          radius={[3,3,0,0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase italic mb-4">Linea {SKILL_NAMES[trendSkill]} nel tempo</h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                      <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => v !== null ? [`${v}%`] : ['—']} />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey={SKILL_NAMES[trendSkill]}
                        stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                        connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* HEATMAP ATTACCO PER ROTAZIONE */}
      {section === 'heatmap' && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase italic">Heatmap Attacco per Rotazione</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Zona di destinazione dell'attacco in ogni rotazione. Ispirato a VolleyMetrics.</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[1,2,3,4,5,6].map(r => (
                  <Button key={r} size="sm" variant={heatmapRot === r ? 'default' : 'outline'}
                    onClick={() => setHeatmapRot(r)}>
                    R{r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* Campo heatmap */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Rotazione {heatmapRot} — destinazione attacchi</p>
                <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                  {ZONE_LAYOUT.map(z => (
                    <ZoneCell key={z} zone={z} data={currentRotZones[z] || { tot: 0, perf: 0, err: 0 }} maxTot={maxZoneTot} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Intensità = volume · % = (kill - err) / tot</p>
              </div>

              {/* Confronto tutte le rotazioni */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Totale attacchi per rotazione</p>
                <div className="h-48">
                  <ResponsiveContainer>
                    <BarChart data={[1,2,3,4,5,6].map(r => ({
                      name: `R${r}`,
                      Attacchi: Object.values(attackByRotation[r] || {}).reduce((a, z) => a + z.tot, 0),
                      Kills: Object.values(attackByRotation[r] || {}).reduce((a, z) => a + z.perf, 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Attacchi" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                      <Bar dataKey="Kills" fill="#1D9E75" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ALZATA PER ZONA */}
      {section === 'setter' && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase italic">Efficienza Alzata per Zona</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Da dove alza l'alzatrice e verso dove. Zona origine → zona destinazione.</p>
              </div>
              {setterFromZones.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {setterFromZones.map(z => (
                    <Button key={z} size="sm" variant={activeSetterZone === z ? 'default' : 'outline'}
                      onClick={() => setSetterFromZone(z)}>
                      Da P{z}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {setterFromZones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuna azione di alzata con zona disponibile.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Da zona {activeSetterZone} — destinazione alzate</p>
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                    {ZONE_LAYOUT.map(z => (
                      <ZoneCell key={z} zone={z} data={currentSetterZones[z] || { tot: 0, perf: 0, err: 0 }} maxTot={maxSetterTot} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Intensità = volume · % = qualità alzata</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Distribuzione alzate per zona destinazione</p>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <BarChart data={Object.entries(currentSetterZones)
                        .filter(([, d]) => d.tot > 0)
                        .sort((a, b) => b[1].tot - a[1].tot)
                        .map(([z, d]) => ({
                          name: ZONE_LABELS[Number(z)],
                          Alzate: d.tot,
                          Perf: d.perf,
                          Eff: d.tot ? Math.round((d.perf - d.err) / d.tot * 100) : 0,
                        }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Alzate" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                        <Bar dataKey="Perf" name="Perfette" fill="#1D9E75" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
