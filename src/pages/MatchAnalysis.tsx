import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SKILL_COLORS, effBadge, rotColor } from '@/lib/dvwParser';
import type { DVWMatch } from '@/lib/dvwTypes';

type MainTab = 'analisi' | 'fondamentale' | 'avanzate' | 'giocatrice';

const SKILL_LABELS: Record<string, string> = {
  S: 'Servizio', R: 'Ricezione', E: 'Alzata', A: 'Attacco', B: 'Muro', D: 'Difesa',
};

const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

export default function MatchAnalysis() {
  const [matches, setMatches] = useState<DVWMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<MainTab>('analisi');
  const [selSkill, setSelSkill] = useState<string>('A');
  const [selPlayer, setSelPlayer] = useState<string | null>(null);

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('dvw_matches')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false });
    const all = (data || []) as DVWMatch[];
    setMatches(all);
    if (all.length > 0) setSelectedIds(new Set(all.map(m => m.id)));
    setLoading(false);
  };

  const selected = matches.filter(m => selectedIds.has(m.id));

  const toggleMatch = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const aggTeamStats = () => {
    const cum: Record<string, { tot: number; pos: number; perf: number; err: number; neg: number }> = {};
    selected.forEach(m => {
      if (!m.team_stats) return;
      Object.entries(m.team_stats).forEach(([sk, v]: [string, any]) => {
        if (!cum[sk]) cum[sk] = { tot: 0, pos: 0, perf: 0, err: 0, neg: 0 };
        cum[sk].tot += v.tot || 0;
        cum[sk].pos += v.pos || 0;
        cum[sk].perf += v.perf || 0;
        cum[sk].err += v.err || 0;
        cum[sk].neg += v.neg || 0;
      });
    });
    return cum;
  };

  const aggPlayerStats = () => {
    const cum: Record<string, Record<string, { tot: number; pos: number; perf: number; err: number; neg: number }>> = {};
    selected.forEach(m => {
      if (!m.player_stats) return;
      Object.entries(m.player_stats).forEach(([nome, skMap]: [string, any]) => {
        if (!cum[nome]) cum[nome] = {};
        Object.entries(skMap).forEach(([sk, v]: [string, any]) => {
          if (!cum[nome][sk]) cum[nome][sk] = { tot: 0, pos: 0, perf: 0, err: 0, neg: 0 };
          cum[nome][sk].tot += v.tot || 0;
          cum[nome][sk].pos += v.pos || 0;
          cum[nome][sk].perf += v.perf || 0;
          cum[nome][sk].err += v.err || 0;
          cum[nome][sk].neg += v.neg || 0;
        });
      });
    });
    return cum;
  };

  const aggRotStats = () => {
    const cum: Record<number, { tot: number; pos: number; perf: number; err: number; neg: number }> = {};
    for (let r = 1; r <= 6; r++) cum[r] = { tot: 0, pos: 0, perf: 0, err: 0, neg: 0 };
    selected.forEach(m => {
      if (!m.rot_stats) return;
      Object.entries(m.rot_stats).forEach(([r, v]: [string, any]) => {
        const ri = parseInt(r);
        if (!cum[ri]) return;
        cum[ri].tot += v.tot || 0;
        cum[ri].pos += v.pos || 0;
        cum[ri].perf += v.perf || 0;
        cum[ri].err += v.err || 0;
        cum[ri].neg += v.neg || 0;
      });
    });
    return cum;
  };

  const aggSystemStats = () => {
    const cum = {
      fbso: { att: 0, pts: 0 }, so: { att: 0, pts: 0 },
      ps:   { att: 0, pts: 0 }, fbps: { att: 0, pts: 0 },
    };
    selected.forEach(m => {
      if (!m.system_stats) return;
      (['fbso', 'so', 'ps', 'fbps'] as const).forEach(k => {
        cum[k].att += m.system_stats[k]?.att || 0;
        cum[k].pts += m.system_stats[k]?.pts || 0;
      });
    });
    return {
      fbso: { ...cum.fbso, pct: pct(cum.fbso.pts, cum.fbso.att) },
      so:   { ...cum.so,   pct: pct(cum.so.pts,   cum.so.att)   },
      ps:   { ...cum.ps,   pct: pct(cum.ps.pts,   cum.ps.att)   },
      fbps: { ...cum.fbps, pct: pct(cum.fbps.pts, cum.fbps.att) },
    };
  };

  const aggDirectional = (skill: string) => {
    const all: { z1: number; z2: number; ev: string }[] = [];
    selected.forEach(m => {
      if (!m.directional?.[skill]) return;
      all.push(...m.directional[skill]);
    });
    return all;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (matches.length === 0) return (
    <div className="p-6 text-center text-muted-foreground">
      <p className="text-lg font-medium">Nessuna partita importata</p>
      <p className="text-sm mt-1">Vai su Importa DVW per caricare file .dvw</p>
    </div>
  );

  const teamStats = aggTeamStats();
  const playerStats = aggPlayerStats();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-secondary/20 flex flex-col">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Partite</p>
          <div className="flex gap-1 mt-2">
            <button onClick={() => setSelectedIds(new Set(matches.map(m => m.id)))}
              className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20">
              Tutte
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground">
              Nessuna
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {matches.map(m => (
            <button key={m.id} onClick={() => toggleMatch(m.id)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                selectedIds.has(m.id)
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-transparent border border-transparent hover:bg-secondary/40'
              }`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.vinta ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs font-semibold text-foreground truncate">{m.avversario}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex justify-between">
                <span>{m.risultato}</span>
                <span>{m.data ? new Date(m.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-center">
          {selectedIds.size} / {matches.length} selezionate
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 flex gap-1 py-2">
          {(['analisi', 'fondamentale', 'avanzate', 'giocatrice'] as MainTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t === 'analisi' ? 'Analisi' : t === 'fondamentale' ? 'Fondamentale' : t === 'avanzate' ? 'Avanzate' : 'Giocatrice'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selected.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p>Seleziona almeno una partita dalla sidebar</p>
            </div>
          )}
          {selected.length > 0 && tab === 'analisi' && <AnalisiView teamStats={teamStats} selected={selected} />}
          {selected.length > 0 && tab === 'fondamentale' && <FondamentaleView teamStats={teamStats} selSkill={selSkill} setSelSkill={setSelSkill} />}
          {selected.length > 0 && tab === 'avanzate' && <AvanzateView rotStats={aggRotStats()} systemStats={aggSystemStats()} directional={aggDirectional} selSkill={selSkill} setSelSkill={setSelSkill} />}
          {selected.length > 0 && tab === 'giocatrice' && <GiocatriceView playerStats={playerStats} selPlayer={selPlayer} setSelPlayer={setSelPlayer} />}
        </div>
      </div>
    </div>
  );
}

function AnalisiView({ teamStats, selected }: { teamStats: any; selected: DVWMatch[] }) {
  const vinte = selected.filter(m => m.vinta).length;
  const winPct = pct(vinte, selected.length);
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Partite" value={selected.length.toString()} color="#22D3EE" />
        <KpiCard label="Vinte" value={vinte.toString()} color="#4ADE80" />
        <KpiCard label="Perse" value={(selected.length - vinte).toString()} color="#F87171" />
        <KpiCard label="Win%" value={`${winPct}%`} color="#22D3EE" big />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Statistiche per Fondamentale</h3>
        {Object.entries(SKILL_LABELS).map(([sk, label]) => {
          const s = teamStats[sk];
          if (!s || !s.tot) return null;
          const { value: eff, color: effColor } = effBadge(s.pos, s.err, s.tot);
          const percPos = pct(s.pos, s.tot);
          const percPerf = pct(s.perf, s.tot);
          const percErr = pct(s.err, s.tot);
          return (
            <div key={sk} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: SKILL_COLORS[sk] }}>{sk}</span>
                  <span className="text-foreground font-semibold">{label}</span>
                  <span className="text-muted-foreground text-xs">{s.tot} az.</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: effColor }}>
                  {eff > 0 ? '+' : ''}{eff}%
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="rounded-full" style={{ width: `${percPerf}%`, background: '#16A34A' }} />
                <div className="rounded-full" style={{ width: `${Math.max(0, percPos - percPerf)}%`, background: '#86EFAC' }} />
                <div className="rounded-full" style={{ width: `${100 - percPos - percErr}%`, background: '#4B5563' }} />
                <div className="rounded-full" style={{ width: `${percErr}%`, background: '#DC2626' }} />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="text-green-400 font-bold">{percPerf}%</span> perf.</span>
                <span><span className="text-emerald-400 font-bold">{percPos}%</span> pos.</span>
                <span><span className="text-red-400 font-bold">{percErr}%</span> err.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FondamentaleView({ teamStats, selSkill, setSelSkill }: { teamStats: any; selSkill: string; setSelSkill: (s: string) => void }) {
  const s = teamStats[selSkill];
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(SKILL_LABELS).map(([sk, label]) => (
          <button key={sk} onClick={() => setSelSkill(sk)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
              selSkill === sk ? 'text-white border-transparent' : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
            }`}
            style={selSkill === sk ? { background: SKILL_COLORS[sk] } : {}}>
            {sk} — {label}
          </button>
        ))}
      </div>
      {!s || !s.tot ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Nessun dato per {SKILL_LABELS[selSkill]}</div>
      ) : (
        <div className="space-y-4">
          {s.byZone && Object.keys(s.byZone).length > 0 && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Heatmap Zone</h4>
              <div className="grid grid-cols-3 gap-1 w-48 mx-auto">
                {[4,3,2,5,6,1,7,8,9].map(z => {
                  const zd = s.byZone[z];
                  const intensity = zd ? pct(zd.tot, s.tot) : 0;
                  return (
                    <div key={z} className="aspect-square rounded flex items-center justify-center relative overflow-hidden"
                      style={{ background: `rgba(34,211,238,${intensity / 100 * 0.8 + 0.05})` }}>
                      <span className="text-white/80 text-[10px] font-bold">{z}</span>
                      {zd && <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white/60">{intensity}%</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {s.byTipo && Object.keys(s.byTipo).length > 0 && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Per Tipo Tecnico</h4>
              <div className="space-y-2">
                {Object.entries(s.byTipo).sort((a: any, b: any) => b[1].tot - a[1].tot).map(([tipo, td]: [string, any]) => (
                  <div key={tipo} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{tipo}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden flex gap-0.5">
                      <div style={{ width: `${pct(td.perf, td.tot)}%`, background: '#16A34A' }} className="rounded-full" />
                      <div style={{ width: `${Math.max(0, pct(td.pos, td.tot) - pct(td.perf, td.tot))}%`, background: '#86EFAC' }} className="rounded-full" />
                      <div style={{ width: `${100 - pct(td.pos, td.tot) - pct(td.err, td.tot)}%`, background: '#4B5563' }} className="rounded-full" />
                      <div style={{ width: `${pct(td.err, td.tot)}%`, background: '#DC2626' }} className="rounded-full" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{td.tot}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {s.bySet && Object.keys(s.bySet).length > 0 && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Per Set</h4>
              <div className="flex gap-6">
                {Object.entries(s.bySet).map(([setN, sd]: [string, any]) => {
                  const { value: eff, color } = effBadge(sd.pos, sd.err, sd.tot);
                  return (
                    <div key={setN} className="text-center">
                      <div className="text-xs text-muted-foreground">Set {setN}</div>
                      <div className="text-2xl font-black" style={{ color }}>{eff > 0 ? '+' : ''}{eff}%</div>
                      <div className="text-xs text-muted-foreground">{sd.tot} az.</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AvanzateView({ rotStats, systemStats, directional, selSkill, setSelSkill }: any) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Analisi per Rotazione</h3>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(r => {
            const v = rotStats[r];
            if (!v || !v.tot) return (
              <div key={r} className="p-3 rounded-lg border border-border bg-secondary/20 text-center">
                <div className="text-xs text-muted-foreground">Rot {r}</div>
                <div className="text-muted-foreground text-sm mt-1">—</div>
              </div>
            );
            const effPct = pct(v.pos, v.tot) - pct(v.err, v.tot);
            const colors = rotColor(effPct);
            return (
              <div key={r} className="p-3 rounded-lg border-l-4"
                style={{ background: colors.bg, borderColor: colors.border }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold" style={{ color: colors.label }}>Rot {r}</span>
                  <span className="text-xs text-muted-foreground">{v.tot} az.</span>
                </div>
                <div className="text-2xl font-black" style={{ color: colors.num }}>
                  {effPct > 0 ? '+' : ''}{effPct}%
                </div>
                <div className="text-xs mt-1" style={{ color: colors.label }}>
                  {pct(v.perf, v.tot)}% perf · {pct(v.err, v.tot)}% err
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Sistema — FBSO / SO / PS / FBPS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { k: 'fbso', label: 'FBSO', desc: '1° att. dopo ric.', color: '#22D3EE' },
            { k: 'so',   label: 'SO',   desc: 'Side Out',          color: '#A78BFA' },
            { k: 'ps',   label: 'PS',   desc: 'Point Score',       color: '#FCD34D' },
            { k: 'fbps', label: 'FBPS', desc: '1° att. PS',        color: '#34D399' },
          ].map(({ k, label, desc, color }) => {
            const v = systemStats[k];
            return (
              <div key={k} className="text-center p-3 rounded-lg bg-secondary/40">
                <div className="text-xs text-muted-foreground mb-1">{desc}</div>
                <div className="text-3xl font-black" style={{ color }}>{v?.pct || 0}%</div>
                <div className="font-bold text-sm mt-0.5" style={{ color }}>{label}</div>
                <div className="text-xs text-muted-foreground mt-1">{v?.pts || 0}/{v?.att || 0}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Directional Lines</h3>
          <div className="flex gap-1">
            {['A','S','R'].map(sk => (
              <button key={sk} onClick={() => setSelSkill(sk)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  selSkill === sk ? 'text-white' : 'bg-secondary text-muted-foreground'
                }`}
                style={selSkill === sk ? { background: SKILL_COLORS[sk] } : {}}>
                {sk}
              </button>
            ))}
          </div>
        </div>
        <DirectionalCourt actions={directional(selSkill)} />
      </div>
    </div>
  );
}

function DirectionalCourt({ actions }: { actions: { z1: number; z2: number; ev: string }[] }) {
  const W = 300, H = 270;
  const ZC: Record<number, [number, number]> = {
    1: [225,200], 2: [225,70], 3: [150,70],
    4: [75,70],   5: [75,200], 6: [150,200],
    7: [50,250],  8: [150,250], 9: [250,250],
  };

  const grouped: Record<string, { count: number; pos: number }> = {};
  actions.forEach(a => {
    const key = `${a.z1}-${a.z2}`;
    if (!grouped[key]) grouped[key] = { count: 0, pos: 0 };
    grouped[key].count++;
    if (a.ev === '#' || a.ev === '+') grouped[key].pos++;
  });
  const maxCount = Math.max(1, ...Object.values(grouped).map(g => g.count));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto rounded-lg overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #172e4a 100%)' }}>
      <rect x={30} y={10} width={240} height={250} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <line x1={30} y1={135} x2={270} y2={135} stroke="white" strokeWidth={3} />
      <line x1={30} y1={75}  x2={270} y2={75}  stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={30} y1={195} x2={270} y2={195} stroke="rgba(255,255,255,0.4)" strokeWidth={1} strokeDasharray="4,3" />
      {[110,150,190].map(x => (
        <line key={x} x1={x} y1={10} x2={x} y2={260} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
      ))}
      <text x={150} y={131} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.4)">RETE</text>
      {Object.entries(ZC).map(([z, [cx, cy]]) => (
        <text key={z} x={cx} y={cy+3} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.2)" fontWeight="bold">{z}</text>
      ))}
      {Object.entries(grouped).map(([key, { count, pos }]) => {
        const [z1s, z2s] = key.split('-');
        const from = ZC[parseInt(z1s)];
        const to = ZC[parseInt(z2s)];
        if (!from || !to) return null;
        const thickness = Math.max(1, (count / maxCount) * 5);
        const posRatio = pos / count;
        const col = posRatio >= 0.6 ? '#4ADE80' : posRatio >= 0.3 ? '#FCD34D' : '#F87171';
        const dx = to[0]-from[0], dy = to[1]-from[1];
        const len = Math.sqrt(dx*dx+dy*dy) || 1;
        const nx = dx/len, ny = dy/len;
        const ex = to[0]-nx*8, ey = to[1]-ny*8;
        return (
          <g key={key}>
            <line x1={from[0]} y1={from[1]} x2={ex} y2={ey}
              stroke={col} strokeWidth={thickness} strokeOpacity={0.7} strokeLinecap="round" />
            <polygon
              points={`${to[0]},${to[1]} ${ex-ny*4},${ey+nx*4} ${ex+ny*4},${ey-nx*4}`}
              fill={col} fillOpacity={0.8} />
            {count > 1 && (
              <text x={(from[0]+to[0])/2} y={(from[1]+to[1])/2} textAnchor="middle" fontSize={7} fill="white">{count}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function GiocatriceView({ playerStats, selPlayer, setSelPlayer }: { playerStats: any; selPlayer: string | null; setSelPlayer: (p: string) => void }) {
  const players = Object.keys(playerStats).sort();
  useEffect(() => { if (!selPlayer && players.length > 0) setSelPlayer(players[0]); }, [players.length]);
  const ps = selPlayer ? playerStats[selPlayer] : null;
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex gap-2 flex-wrap">
        {players.map(p => (
          <button key={p} onClick={() => setSelPlayer(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              selPlayer === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
            }`}>
            {p}
          </button>
        ))}
      </div>
      {ps && (
        <div className="space-y-3">
          {Object.entries(SKILL_LABELS).map(([sk, label]) => {
            const s = ps[sk];
            if (!s || !s.tot) return null;
            const { value: eff, color } = effBadge(s.pos, s.err, s.tot);
            return (
              <div key={sk} className="p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: SKILL_COLORS[sk] }}>{sk}</span>
                    <span className="text-foreground font-semibold text-sm">{label}</span>
                    <span className="text-muted-foreground text-xs">{s.tot} az.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: color }}>
                    {eff > 0 ? '+' : ''}{eff}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Perfetta', value: s.perf, color: '#4ADE80' },
                    { label: 'Positive', value: s.pos,  color: '#86EFAC' },
                    { label: 'Errori',   value: s.err,  color: '#F87171' },
                    { label: 'Totale',   value: s.tot,  color: '#9CA3AF' },
                  ].map(({ label: l, value, color: c }) => (
                    <div key={l}>
                      <div className="text-xl font-black" style={{ color: c }}>{value}</div>
                      <div className="text-[10px] text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border text-center">
      <div className={`font-black leading-none ${big ? 'text-4xl' : 'text-3xl'}`} style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-2 font-medium">{label}</div>
    </div>
  );
}
