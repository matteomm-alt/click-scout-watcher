import { useState } from 'react';
import { type DbAction, rotationOf, phaseOf, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SetProgressTab } from '@/components/SetProgressTab';
import { TechTypesTab } from '@/components/TechTypesTab';
import { RotationsDetailTab } from '@/components/RotationsDetailTab';
import { SetDistributionTab } from '@/components/SetDistributionTab';
import { PhaseToggle } from './shared/PhaseToggle';
import { MiniField } from './shared/MiniField';
import { GameSpeedPanel } from './shared/GameSpeedPanel';
import { SequenceTab } from './SequenceTab';

const SERVE_TYPES = [
  { key: 'M', label: 'Jump Float' },
  { key: 'Q', label: 'Jump Spin' },
  { key: 'H', label: 'Float' },
];

const ATTACK_TYPES = [
  { key: 'H', label: 'Alta' },
  { key: 'Q', label: 'Veloce' },
  { key: 'T', label: 'Tesa' },
  { key: 'U', label: 'Super' },
];

export function AdvancedTab({ actions, allActions, teamId, side }: { actions: DbAction[]; allActions: DbAction[]; teamId: string; side: 'home' | 'away' }) {
  const pct = (n: number, d: number) => d ? Math.round(n / d * 100) : 0;
  const [advancedTab, setAdvancedTab] = useState<'base' | 'distribution' | 'reception' | 'serve' | 'block' | 'sequence'>('base');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'K1' | 'K2'>('all');
  const [dirSkill, setDirSkill] = useState<string>('A');
  const [dirType, setDirType] = useState<string>('all');
  const [attackType, setAttackType] = useState<string>('all');

  const phaseActions = actions.filter(a => phaseFilter === 'all' || phaseOf(a, side) === phaseFilter);
  const phaseAllActions = allActions.filter(a => phaseFilter === 'all' || phaseOf(a, side) === phaseFilter);

  const rallies = new Map<string, DbAction[]>();
  phaseAllActions.forEach(a => {
    const key = `${a.set_number}-${a.rally_index}`;
    if (!rallies.has(key)) rallies.set(key, []);
    rallies.get(key)!.push(a);
  });

  let fbso_att = 0, fbso_pts = 0, so_att = 0, so_pts = 0;
  let ps_att = 0, ps_pts = 0, fbps_att = 0, fbps_pts = 0;

  rallies.forEach(rally => {
    const home = rally.filter(a => a.scout_team_id === teamId);
    const away = rally.filter(a => a.scout_team_id !== teamId);
    const homeRec = home.findIndex(a => a.skill === 'R');
    if (homeRec >= 0) {
      const atts = home.slice(homeRec).filter(a => a.skill === 'A');
      if (atts.length) {
        so_att++; if (atts.some(a => a.evaluation === '#')) so_pts++;
        fbso_att++; if (atts[0].evaluation === '#') fbso_pts++;
      }
    }
    const awayRec = away.findIndex(a => a.skill === 'R');
    if (awayRec >= 0 && homeRec < 0) {
      const atts = home.filter(a => a.skill === 'A');
      if (atts.length) {
        ps_att++; if (atts.some(a => a.evaluation === '#')) ps_pts++;
        fbps_att++; if (atts[0].evaluation === '#') fbps_pts++;
      }
    }
  });

  const systemStats = [
    { label: 'FBSO', desc: '1° att. dopo ric.', att: fbso_att, pts: fbso_pts, pct: pct(fbso_pts, fbso_att) },
    { label: 'SO',   desc: 'Side Out',           att: so_att,   pts: so_pts,   pct: pct(so_pts, so_att) },
    { label: 'PS',   desc: 'Point Score',         att: ps_att,   pts: ps_pts,   pct: pct(ps_pts, ps_att) },
    { label: 'FBPS', desc: '1° att. in PS',       att: fbps_att, pts: fbps_pts, pct: pct(fbps_pts, fbps_att) },
  ];

  const attActs = phaseActions.filter(a => a.skill === 'A');
  const kills = attActs.filter(a => a.evaluation === '#').length;
  const attErr = attActs.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
  const hitEff = attActs.length ? ((kills - attErr) / attActs.length * 100).toFixed(1) : '—';

  const dirActs = phaseActions.filter(a =>
    a.skill === dirSkill && a.start_zone && a.end_zone &&
    (dirSkill !== 'S' || dirType === 'all' || a.skill_type === dirType) &&
    (dirSkill !== 'A' || attackType === 'all' || a.skill_type === attackType)
  );

  const ZC: Record<number, [number, number]> = {
    1: [225,200], 2: [225,70], 3: [150,70],
    4: [75,70],   5: [75,200], 6: [150,200],
    7: [50,250],  8: [150,250], 9: [250,250],
  };

  const grouped: Record<string, { count: number; pts: number }> = {};
  dirActs.forEach(a => {
    const key = `${a.start_zone}-${a.end_zone}`;
    if (!grouped[key]) grouped[key] = { count: 0, pts: 0 };
    grouped[key].count++;
    if (a.evaluation === '#' || a.evaluation === '+') grouped[key].pts++;
  });
  const maxCount = Math.max(1, ...Object.values(grouped).map(g => g.count));

  return (
    <div className="space-y-6">
      <PhaseToggle value={phaseFilter} onChange={setPhaseFilter} />
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1">
        {[
          ['base', 'Base'], ['distribution', 'Distribuzione'], ['reception', 'Ricezione'], ['serve', 'Battuta'], ['block', 'Muro'], ['sequence', 'Sequenze'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setAdvancedTab(key as typeof advancedTab)} className={`min-h-10 px-3 rounded text-xs font-bold uppercase ${advancedTab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
        ))}
      </div>

      {advancedTab === 'distribution' && <DistributionAnalysis actions={phaseActions} side={side} pct={pct} />}
      {advancedTab === 'reception' && <ReceptionAnalysis actions={phaseActions} side={side} pct={pct} />}
      {advancedTab === 'serve' && <ServeAnalysis actions={phaseActions} pct={pct} />}
      {advancedTab === 'block' && <BlockAnalysis actions={phaseActions} side={side} pct={pct} />}
      {advancedTab === 'sequence' && <SequenceTab actions={phaseActions} />}
      {advancedTab === 'base' && <>
      <SetProgressTab actions={phaseActions} />
      <GameSpeedPanel actions={phaseActions} />
      <TechTypesTab actions={phaseActions} />
      <RotationsDetailTab actions={phaseActions} side={side} />
      <SetDistributionTab actions={phaseActions} />


      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Sistema — FBSO / SO / PS / FBPS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {systemStats.map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{s.desc}</p>
              <p className="text-3xl font-black italic text-primary">{s.pct}%</p>
              <p className="text-xs font-bold text-muted-foreground mt-1">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.pts}/{s.att}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Hitting Efficiency Attacco</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-black italic text-primary">{hitEff}{attActs.length ? '%' : ''}</p>
            <p className="text-xs text-muted-foreground mt-1">Eff = (Kills − Err) / Att</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-black italic text-success">{kills}</p><p className="text-xs text-muted-foreground">Kills (#)</p></div>
            <div><p className="text-2xl font-black italic text-destructive">{attErr}</p><p className="text-xs text-muted-foreground">Errori (= /)</p></div>
            <div><p className="text-2xl font-black italic">{attActs.length}</p><p className="text-xs text-muted-foreground">Tentativi</p></div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-sm font-bold uppercase italic">Directional Lines</h3>
          <div className="flex flex-wrap gap-1">
            {['A', 'S', 'R'].map(sk => (
              <button key={sk} onClick={() => setDirSkill(sk)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${dirSkill === sk ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {SKILL_NAMES[sk] || sk}
              </button>
            ))}
          </div>
        </div>
        {dirSkill === 'S' && <div className="mb-4 flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...SERVE_TYPES].map(t => <button key={t.key} onClick={() => setDirType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${dirType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>}
        {dirSkill === 'A' && <div className="mb-4 flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...ATTACK_TYPES].map(t => <button key={t.key} onClick={() => setAttackType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${attackType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>}
        <svg viewBox="0 0 300 270" className="w-full max-w-xs mx-auto rounded-lg overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--card)) 100%)' }}>
          <rect x={30} y={10} width={240} height={250} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
          <line x1={30} y1={135} x2={270} y2={135} stroke="hsl(var(--foreground))" strokeWidth={2} strokeOpacity={0.5} />
          <line x1={30} y1={75} x2={270} y2={75} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4,3" />
          <line x1={30} y1={195} x2={270} y2={195} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4,3" />
          {[110,150,190].map(x => <line key={x} x1={x} y1={10} x2={x} y2={260} stroke="hsl(var(--border))" strokeWidth={0.5} />)}
          <text x={150} y={131} textAnchor="middle" fontSize={7} fill="hsl(var(--muted-foreground))">RETE</text>
          {Object.entries(ZC).map(([z, [cx, cy]]) => <text key={z} x={cx} y={cy+3} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))" opacity={0.4} fontWeight="bold">{z}</text>)}
          {Object.entries(grouped).map(([key, { count, pts }]) => {
            const [z1s, z2s] = key.split('-');
            const from = ZC[parseInt(z1s)], to = ZC[parseInt(z2s)];
            if (!from || !to) return null;
            const thickness = Math.max(1, (count / maxCount) * 5);
            const posRatio = pts / count;
            const col = posRatio >= 0.6 ? 'hsl(var(--success))' : posRatio >= 0.3 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
            const dx = to[0]-from[0], dy = to[1]-from[1], len = Math.sqrt(dx*dx+dy*dy) || 1;
            const nx = dx/len, ny = dy/len, ex = to[0]-nx*8, ey = to[1]-ny*8;
            return <g key={key}><line x1={from[0]} y1={from[1]} x2={ex} y2={ey} stroke={col} strokeWidth={thickness} strokeOpacity={0.7} strokeLinecap="round" /><polygon points={`${to[0]},${to[1]} ${ex-ny*4},${ey+nx*4} ${ex+ny*4},${ey-nx*4}`} fill={col} fillOpacity={0.8} />{count > 1 && <text x={(from[0]+to[0])/2} y={(from[1]+to[1])/2} textAnchor="middle" fontSize={7} fill="hsl(var(--foreground))">{count}</text>}</g>;
          })}
        </svg>
        <p className="text-xs text-muted-foreground mt-3 text-center">Verde = positivo · Giallo = neutro · Rosso = errore · Spessore = volume</p>
      </Card>
      </>}
    </div>
  );
}

function DistributionAnalysis({ actions, side, pct }: { actions: DbAction[]; side: 'home' | 'away'; pct: (n: number, d: number) => number }) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [distTab, setDistTab] = useState<'attack' | 'setter'>('attack');
  const zoneGroup = (z: number | null) => z === 2 ? 'sinistra' : z === 3 ? 'centro' : z === 4 ? 'destra' : [1, 5, 6].includes(z || 0) ? 'seconda linea' : 'altro';
  const rows = [1, 2, 3, 4, 5, 6].flatMap((rot) => ['sinistra', 'centro', 'destra', 'seconda linea'].map((zg) => {
    const atts = actions.filter((a) => a.skill === 'A' && rotationOf(a, side) === rot && zoneGroup(a.start_zone) === zg && (selectedType === 'all' || a.skill_type === selectedType));
    const kill = atts.filter((a) => a.evaluation === '#').length;
    const err = atts.filter((a) => a.evaluation === '=' || a.evaluation === '/').length;
    return { rot, zg, total: atts.length, kill, eff: pct(kill - err, atts.length), killPct: pct(kill, atts.length) };
  })).filter((r) => r.total > 0);

  const ZONE_LABELS: Record<number, string> = {
    4: 'Ala Sx', 3: 'Centro', 2: 'Ala Dx',
    1: 'P.Dx', 5: 'P.Sx', 6: 'Retro',
  };
  const ZONE_ORDER = [4, 3, 2, 6, 5, 1];
  const sets = actions.filter(a => a.skill === 'E');
  const byRot: Record<number, DbAction[]> = { 1:[],2:[],3:[],4:[],5:[],6:[] };
  sets.forEach(a => {
    const r = rotationOf(a, side);
    if (r) byRot[r].push(a);
  });
  const getNextAttack = (s: DbAction): DbAction | null =>
    actions.find(a => a.skill === 'A' && a.set_number === s.set_number && a.rally_index === s.rally_index && a.action_index === s.action_index + 1) ?? null;
  const rotationsWithSets = [1,2,3,4,5,6].filter(r => byRot[r].length > 0);
  const totalSets = sets.length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-bold uppercase italic">Distribuzione</h3>
        {distTab === 'attack' && (
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Tipo attacco" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {ATTACK_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.key} — {t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mb-4 flex gap-1 p-1 bg-muted rounded">
        {[
          { key: 'attack', label: 'Attacchi' },
          { key: 'setter', label: 'Alzate' },
        ].map(t => (
          <button key={t.key} onClick={() => setDistTab(t.key as typeof distTab)}
            className={`flex-1 min-h-9 rounded text-xs font-bold uppercase transition-colors ${distTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {distTab === 'attack' && (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="py-2 text-left">Rot</th><th>Zona</th><th>Tot</th><th>Eff%</th><th>Kill%</th></tr></thead><tbody>{rows.map((r) => <tr key={`${r.rot}-${r.zg}`} className="border-b border-border/40"><td className="py-2 font-bold">P{r.rot}</td><td className="text-center">{r.zg}</td><td className="text-center">{r.total}</td><td className={`text-center font-black ${r.eff > 30 ? 'text-success' : r.eff >= 0 ? 'text-warning' : 'text-destructive'}`}>{r.eff}</td><td className="text-center">{r.killPct}</td></tr>)}</tbody></table></div>
      )}

      {distTab === 'setter' && (
        totalSets === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessuna alzata trovata — potrebbero non essere state registrate nel file DVW.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-border rounded">
                <p className="text-2xl font-black italic">{totalSets}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Alzate totali</p>
              </div>
              <div className="p-3 border border-border rounded">
                <p className="text-2xl font-black italic">{pct(sets.filter(a=>[4,3,2].includes(a.end_zone??0)).length, totalSets)}%</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Verso prima linea</p>
              </div>
              <div className="p-3 border border-border rounded">
                <p className="text-2xl font-black italic">{pct(sets.filter(a=>[1,5,6].includes(a.end_zone??0)).length, totalSets)}%</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Verso seconda linea</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rotationsWithSets.map(rot => {
                const rotSets = byRot[rot];
                const total = rotSets.length;
                const zoneData = ZONE_ORDER.map(z => {
                  const zSets = rotSets.filter(a => a.end_zone === z);
                  const attacks = zSets.map(getNextAttack).filter(Boolean) as DbAction[];
                  const kills = attacks.filter(a => a.evaluation === '#').length;
                  const errors = attacks.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
                  return {
                    zone: z,
                    label: ZONE_LABELS[z] ?? `Z${z}`,
                    count: zSets.length,
                    pctOfTotal: pct(zSets.length, total),
                    killPct: attacks.length > 0 ? pct(kills, attacks.length) : null,
                    eff: attacks.length > 0 ? pct(kills - errors, attacks.length) : null,
                  };
                }).filter(d => d.count > 0);
                const topZone = zoneData.reduce((a, b) => b.count > a.count ? b : a, zoneData[0]);
                return (
                  <div key={rot} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="font-black">Rotazione P{rot}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({total} alzate)</span>
                      </div>
                      {topZone && <span className="text-xs text-primary font-bold">→ {topZone.label} ({topZone.pctOfTotal}%)</span>}
                    </div>
                    <div className="space-y-2">
                      {zoneData.map(d => (
                        <div key={d.zone} className="grid grid-cols-[60px_1fr_40px_60px] gap-2 items-center text-xs">
                          <span className="font-bold">{d.label}</span>
                          <div className="relative h-4 bg-background rounded overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-primary/40" style={{ width: `${d.pctOfTotal}%` }} />
                            <span className="absolute inset-0 flex items-center justify-end pr-1 text-[10px] font-bold">{d.count}</span>
                          </div>
                          <span className="text-right text-muted-foreground">{d.pctOfTotal}%</span>
                          {d.killPct !== null ? (
                            <span className={`text-right font-bold ${d.killPct >= 50 ? 'text-success' : d.killPct >= 30 ? 'text-warning' : 'text-destructive'}`}>kill {d.killPct}%</span>
                          ) : <span className="text-right text-muted-foreground/60">—</span>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">kill% = % di # sull'azione successiva alla alzata</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Mostra solo le rotazioni con almeno 1 alzata. I valori kill% richiedono che gli attacchi siano stati scoutizzati.</p>
          </div>
        )
      )}
    </Card>
  );
}

function ReceptionAnalysis({ actions, side, pct }: { actions: DbAction[]; side: 'home' | 'away'; pct: (n: number, d: number) => number }) {
  const rec = actions.filter((a) => a.skill === 'R');
  const zc: Record<number, [number, number]> = { 4:[15,10],3:[45,10],2:[75,10],5:[15,30],6:[45,30],1:[75,30],7:[15,50],8:[45,50],9:[75,50] };
  const band = (z: number | null) => [5,7,4].includes(z || 0) ? 'sinistra' : [6,8,3].includes(z || 0) ? 'centro' : [1,9,2].includes(z || 0) ? 'destra' : 'n/d';
  const dot = (ev: string) => ev === '#' ? '#16a34a' : ev === '=' ? '#dc2626' : '#ca8a04';
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-bold uppercase italic">Ricezione</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {[1,2,3,4,5,6].map((rot) => {
          const items = rec.filter(a => rotationOf(a, side) === rot);
          const players = [...new Set(items.map(a => a.player_number).filter((n): n is number => n !== null))].sort((a,b)=>a-b);
          return (
            <div key={rot} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 font-black">P{rot}</div>
              <div className="text-sm text-muted-foreground">Positività <span className="text-success font-bold">{pct(items.filter(a=>a.evaluation==='#'||a.evaluation==='+').length, items.length)}%</span> · Errori <span className="text-destructive font-bold">{pct(items.filter(a=>a.evaluation==='=').length, items.length)}%</span></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {players.map(num => {
                  const list = items.filter(a => a.player_number === num);
                  const pos = list.filter(a => a.evaluation === '+' || a.evaluation === '!').length;
                  const bands = ['sinistra', 'centro', 'destra'].map(name => {
                    const b = list.filter(a => band(a.end_zone) === name);
                    return { name, pct: pct(b.filter(a => a.evaluation === '#' || a.evaluation === '+' || a.evaluation === '!').length, b.length) };
                  });
                  return (
                    <div key={num} className="rounded border border-border/60 bg-background/40 p-2">
                      <div className="mb-1 text-xs font-black">#{num}</div>
                      <MiniField>{list.map((a, i) => { const c = zc[a.end_zone || 0]; return c ? <circle key={a.id || i} cx={c[0]} cy={c[1]} r="4" fill={dot(a.evaluation)} fillOpacity="0.85" /> : null; })}</MiniField>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]"><span>Tot <b>{list.length}</b></span><span>Prf <b>{pct(list.filter(a=>a.evaluation==='#').length, list.length)}%</b></span><span>Err <b>{pct(list.filter(a=>a.evaluation==='=').length, list.length)}%</b></span><span>Pos <b>{pct(pos, list.length)}%</b></span></div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">{bands.map(b => <span key={b.name}>{b.name.slice(0,3)} <b className="text-foreground">{b.pct}%</b></span>)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ServeAnalysis({ actions, pct }: { actions: DbAction[]; pct: (n: number, d: number) => number }) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const serves = actions.filter((a) => a.skill === 'S' && (selectedType === 'all' || a.skill_type === selectedType));
  const players = [...new Set(serves.map((a) => a.player_number).filter((n): n is number => n !== null))].sort((a,b)=>a-b);
  const zc: Record<number, [number, number]> = { 4:[15,10],3:[45,10],2:[75,10],5:[15,30],6:[45,30],1:[75,30],7:[15,50],8:[45,50],9:[75,50] };
  const color = (ev: string) => ev === '#' ? '#000' : ev === '=' ? '#dc2626' : ev === '/' ? '#ea580c' : '#ca8a04';
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-bold uppercase italic">Battuta</h3>
        <div className="flex flex-wrap gap-1">{[{ key: 'all', label: 'Tutti' }, ...SERVE_TYPES].map(t => <button key={t.key} onClick={() => setSelectedType(t.key)} className={`px-3 py-1 rounded text-xs font-bold ${selectedType === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.key === 'all' ? t.label : `${t.key}=${t.label}`}</button>)}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{players.map((n)=>{
        const playerServes = serves.filter(a=>a.player_number===n);
        return <div key={n} className="rounded-lg border border-border bg-muted/30 p-3"><div className="mb-2 font-black">#{n}</div><div className="grid gap-2 sm:grid-cols-3">{SERVE_TYPES.map(t => { const items = playerServes.filter(a => a.skill_type === t.key); if (!items.length) return null; return <div key={t.key}><div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{t.label}</div><MiniField>{items.map(a=>{const st=zc[a.start_zone || 0], e=zc[a.end_zone || 0]; if(!st||!e)return null; return <line key={a.id} x1={st[0]} y1={st[1]} x2={e[0]} y2={e[1]} stroke={color(a.evaluation)} strokeWidth="1.5" />})}</MiniField></div>; })}</div><div className="mt-2 grid grid-cols-3 text-center text-xs"><span>Tot <b>{playerServes.length}</b></span><span>Ace% <b>{pct(playerServes.filter(a=>a.evaluation==='#').length, playerServes.length)}</b></span><span>Err% <b>{pct(playerServes.filter(a=>a.evaluation==='=').length, playerServes.length)}</b></span></div></div>;
      })}</div>
    </Card>
  );
}

function BlockAnalysis({ actions, side, pct }: { actions: DbAction[]; side: 'home' | 'away'; pct: (n: number, d: number) => number }) {
  const blocks = actions.filter(a => a.skill === 'B');
  const total = blocks.length;
  const points = blocks.filter(a => a.evaluation === '#').length;
  const errors = blocks.filter(a => a.evaluation === '=' || a.evaluation === '/').length;

  const byPlayer = new Map<number, DbAction[]>();
  for (const b of blocks) {
    if (b.player_number === null) continue;
    if (!byPlayer.has(b.player_number)) byPlayer.set(b.player_number, []);
    byPlayer.get(b.player_number)!.push(b);
  }
  const playerRows = [...byPlayer.entries()]
    .map(([num, list]) => ({
      num,
      tot: list.length,
      pts: list.filter(a => a.evaluation === '#').length,
      err: list.filter(a => a.evaluation === '=' || a.evaluation === '/').length,
    }))
    .sort((a, b) => b.tot - a.tot);

  const byRotation = new Map<number, DbAction[]>();
  for (let r = 1; r <= 6; r++) byRotation.set(r, []);
  for (const b of blocks) {
    const r = rotationOf(b, side);
    if (r) byRotation.get(r)!.push(b);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Muri totali</p>
          <p className="text-4xl font-black italic">{total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Punti (#)</p>
          <p className="text-4xl font-black italic text-success">{points} <span className="text-base text-muted-foreground">{pct(points, total)}%</span></p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Errori (= /)</p>
          <p className="text-4xl font-black italic text-destructive">{errors} <span className="text-base text-muted-foreground">{pct(errors, total)}%</span></p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Per giocatore</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">N°</th><th>Tot</th><th>Punti</th><th>Punti%</th><th>Errori</th><th>Errori%</th></tr>
            </thead>
            <tbody>
              {playerRows.map(r => (
                <tr key={r.num} className="border-b border-border/40">
                  <td className="py-2 font-bold">#{r.num}</td>
                  <td className="text-center">{r.tot}</td>
                  <td className="text-center text-success">{r.pts}</td>
                  <td className="text-center font-bold text-success">{pct(r.pts, r.tot)}%</td>
                  <td className="text-center text-destructive">{r.err}</td>
                  <td className="text-center font-bold text-destructive">{pct(r.err, r.tot)}%</td>
                </tr>
              ))}
              {playerRows.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-4">Nessun muro registrato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase italic mb-4">Per rotazione</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(r => {
            const list = byRotation.get(r)!;
            const tot = list.length;
            const pts = list.filter(a => a.evaluation === '#').length;
            const eff = tot ? Math.round(((pts - list.filter(a => a.evaluation === '=' || a.evaluation === '/').length) / tot) * 100) : 0;
            return (
              <div key={r} className="p-4 border border-border rounded">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotazione {r}</p>
                <p className="text-2xl font-black italic mt-1">{tot} <span className="text-xs text-muted-foreground">muri</span></p>
                <p className="text-sm mt-1">Punti <span className="text-success font-bold">{pts}</span> · Eff <span className={`font-bold ${eff >= 0 ? 'text-success' : 'text-destructive'}`}>{eff}%</span></p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
