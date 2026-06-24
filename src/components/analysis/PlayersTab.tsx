import { useMemo, useState } from 'react';
import { type DbAction, statsByPlayer, SKILL_NAMES } from '@/lib/scoutAnalysis';
import {
  attackByPhasePerPlayer,
  attackBreakdownPerPlayer,
  receptionExpectedPointsPerPlayer,
  servePressureIndexPerPlayer,
} from '@/lib/scoutPlayerAdvanced';
import { Card } from '@/components/ui/card';
import type { MatchRow } from './types';

type SubTab = 'base' | 'attackPhase' | 'attackBreakdown' | 'reception' | 'serve';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'base', label: 'Tabella base' },
  { key: 'attackPhase', label: 'Attacco K1/K2' },
  { key: 'attackBreakdown', label: 'Per zona / tempo' },
  { key: 'reception', label: 'Ricezione+' },
  { key: 'serve', label: 'Battuta+' },
];

interface PlayersTabProps {
  actions: DbAction[];                       // azioni della squadra (filtrate)
  allActions: DbAction[];                    // tutte le azioni filtrate (entrambe le squadre)
  playerNames: Map<number, string>;
  match: MatchRow;
  teamName: string;
  teamId: string;
  side: 'home' | 'away';
}

export function PlayersTab({ actions, allActions, playerNames, match, teamName, teamId, side }: PlayersTabProps) {
  const [sub, setSub] = useState<SubTab>('base');
  const players = useMemo(() => statsByPlayer(actions), [actions]);

  const exportPlayerPdf = async (num: number) => {
    const playerActions = actions.filter(a => a.player_number === num);
    const stat = (skill: string) => {
      const list = playerActions.filter(a => a.skill === skill);
      const tot = list.length;
      const perf = list.filter(a => a.evaluation === '#').length;
      const pos = list.filter(a => a.evaluation === '#' || a.evaluation === '+').length;
      const err = list.filter(a => a.evaluation === '=' || a.evaluation === '/').length;
      const posPct = tot ? (pos / tot) * 100 : 0;
      const errPct = tot ? (err / tot) * 100 : 0;
      const eff = tot ? ((perf - err) / tot) * 100 : 0;
      return { tot, perf, pos, err, posPct, errPct, eff };
    };
    const skills: { key: string; label: string }[] = [
      { key: 'S', label: 'Battuta' }, { key: 'R', label: 'Ricezione' },
      { key: 'A', label: 'Attacco' }, { key: 'B', label: 'Muro' }, { key: 'D', label: 'Difesa' },
    ];
    const stats = skills.map(s => ({ ...s, ...stat(s.key) }));

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const playerName = playerNames.get(num) || `#${num}`;
    const date = match.match_date || new Date().toISOString().slice(0, 10);

    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text(`#${num} ${playerName}`, 14, 20);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`${teamName}`, 14, 27);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`${match.home_team.name} vs ${match.away_team.name} · ${date}${match.league ? ' · ' + match.league : ''}`, 14, 33);
    doc.setTextColor(0);
    doc.line(14, 37, 196, 37);

    const cx = 60, cy = 75, R = 32;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Profilo (Pos% per skill)', 14, 47);
    doc.setDrawColor(220);
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        pts.push([cx + Math.cos(ang) * R * f, cy + Math.sin(ang) * R * f]);
      }
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % pts.length];
        doc.line(x1, y1, x2, y2);
      }
    });
    doc.setDrawColor(180); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    stats.forEach((s, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI / 5);
      const ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
      doc.line(cx, cy, ex, ey);
      const lx = cx + Math.cos(ang) * (R + 6), ly = cy + Math.sin(ang) * (R + 6);
      doc.text(s.label, lx, ly, { align: 'center', baseline: 'middle' });
    });
    doc.setDrawColor(249, 115, 22); doc.setFillColor(249, 115, 22);
    const valPts: [number, number][] = stats.map((s, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI / 5);
      const r = (Math.max(0, Math.min(100, s.posPct)) / 100) * R;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    });
    for (let i = 0; i < valPts.length; i++) {
      const [x1, y1] = valPts[i]; const [x2, y2] = valPts[(i + 1) % valPts.length];
      doc.setLineWidth(0.6);
      doc.line(x1, y1, x2, y2);
    }
    valPts.forEach(([x, y]) => doc.circle(x, y, 0.8, 'F'));
    doc.setLineWidth(0.2); doc.setDrawColor(0);

    let y = 120;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Dettaglio per fondamentale', 14, y); y += 6;
    doc.setFontSize(9);
    const headers = ['Skill', 'Tot', 'Pos%', 'Err%', 'Eff%'];
    const colsX = [14, 60, 90, 120, 150];
    headers.forEach((h, i) => doc.text(h, colsX[i], y));
    y += 2; doc.line(14, y, 196, y); y += 5;
    doc.setFont('helvetica', 'normal');
    stats.forEach(s => {
      doc.text(s.label, colsX[0], y);
      doc.text(String(s.tot), colsX[1], y);
      doc.text(`${s.posPct.toFixed(0)}%`, colsX[2], y);
      doc.text(`${s.errPct.toFixed(0)}%`, colsX[3], y);
      doc.text(`${s.eff.toFixed(0)}%`, colsX[4], y);
      y += 6;
    });

    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Heatmap zone', 14, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Attacchi: punto di caduta reale se rilevato, altrimenti zona del colpo. Altri fondamentali: zona di partenza.', 14, y); y += 5;
    doc.setTextColor(0);
    const zoneCounts: Record<number, number> = {};
    playerActions.forEach(a => {
      const z = (a.skill === 'A')
        ? (a.landing_zone ?? a.end_zone)
        : a.start_zone;
      if (z && z >= 1 && z <= 9) zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    });
    const maxZ = Math.max(1, ...Object.values(zoneCounts));
    const gridX = 14, gridY = y + 2, cellW = 20, cellH = 20;
    const layout = [4,3,2,5,6,1,7,8,9];
    layout.forEach((z, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = gridX + col * cellW, yy = gridY + row * cellH;
      const c = zoneCounts[z] || 0;
      const intensity = c / maxZ;
      doc.setFillColor(249, 115, 22, (intensity * 255) as unknown as number);
      doc.setDrawColor(180);
      doc.rect(x, yy, cellW - 1, cellH - 1, c > 0 ? 'FD' : 'D');
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(`P${z}`, x + 1.5, yy + 4);
      doc.setFontSize(11); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
      doc.text(String(c), x + cellW / 2 - 0.5, yy + cellH / 2 + 1, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Generato da VolleyScout Pro', 14, 290);

    const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 20) || 'atleta';
    doc.save(`${num}_${safe(playerName)}_${date}.pdf`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`px-3 py-2 text-xs font-bold uppercase italic tracking-tight border-b-2 transition-colors ${
              sub === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {sub === 'base' && (
        <Card className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Atleta</th>
                <th>Tot</th>
                {['S','R','A','B','D','E'].map(s => <th key={s}>{SKILL_NAMES[s]}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.number} className="border-b border-border/40">
                  <td className="py-2 font-bold">
                    #{p.number} <span className="font-normal text-muted-foreground">{playerNames.get(p.number) || ''}</span>
                  </td>
                  <td className="text-center">{p.total}</td>
                  {['S','R','A','B','D','E'].map(s => {
                    const st = p.bySkill[s];
                    return (
                      <td key={s} className="text-center">
                        {st ? (
                          <div className="text-xs">
                            <div className="font-semibold">{st.total}</div>
                            <div className="text-muted-foreground">eff {st.efficiency.toFixed(0)}%</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                  <td className="text-center">
                    <button
                      onClick={() => exportPlayerPdf(p.number)}
                      className="min-h-8 px-2 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                      title="Scheda PDF"
                    >📄 PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {sub === 'attackPhase' && <AttackPhaseView actions={actions} side={side} playerNames={playerNames} />}
      {sub === 'attackBreakdown' && <AttackBreakdownView actions={actions} playerNames={playerNames} />}
      {sub === 'reception' && <ReceptionXPView actions={actions} playerNames={playerNames} />}
      {sub === 'serve' && <ServePressureView allActions={allActions} teamId={teamId} playerNames={playerNames} />}
    </div>
  );
}

/* ---------- viste ---------- */

function AttackPhaseView({ actions, side, playerNames }: { actions: DbAction[]; side: 'home' | 'away'; playerNames: Map<number, string> }) {
  const rows = useMemo(() => attackByPhasePerPlayer(actions, side), [actions, side]);
  if (rows.length === 0) return <Card className="p-5 text-sm text-muted-foreground">Nessun dato attacco con fase di gioco identificabile.</Card>;
  return (
    <Card className="p-5 overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-3">
        <strong className="text-foreground">K1 = side-out</strong> (squadra in ricezione), <strong className="text-foreground">K2 = break point</strong> (squadra in battuta).
      </p>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2">Atleta</th>
            <th>Tot</th>
            <th colSpan={4} className="border-l border-border/40">K1 — side-out</th>
            <th colSpan={4} className="border-l border-border/40">K2 — break</th>
          </tr>
          <tr className="text-[10px]">
            <th></th><th></th>
            <th className="border-l border-border/40">Att</th><th>Kill%</th><th>Err%</th><th>Eff%</th>
            <th className="border-l border-border/40">Att</th><th>Kill%</th><th>Err%</th><th>Eff%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.number} className="border-b border-border/40">
              <td className="py-2 font-bold">#{p.number} <span className="font-normal text-muted-foreground">{playerNames.get(p.number) || ''}</span></td>
              <td className="text-center">{p.total}</td>
              <td className="text-center border-l border-border/40">{p.K1.total}</td>
              <td className="text-center">{p.K1.total ? p.K1.killPct.toFixed(0) + '%' : '—'}</td>
              <td className="text-center">{p.K1.total ? p.K1.errorPct.toFixed(0) + '%' : '—'}</td>
              <td className={`text-center font-semibold ${p.K1.efficiency >= 30 ? 'text-emerald-500' : p.K1.efficiency < 0 ? 'text-destructive' : ''}`}>{p.K1.total ? p.K1.efficiency.toFixed(0) + '%' : '—'}</td>
              <td className="text-center border-l border-border/40">{p.K2.total}</td>
              <td className="text-center">{p.K2.total ? p.K2.killPct.toFixed(0) + '%' : '—'}</td>
              <td className="text-center">{p.K2.total ? p.K2.errorPct.toFixed(0) + '%' : '—'}</td>
              <td className={`text-center font-semibold ${p.K2.efficiency >= 30 ? 'text-emerald-500' : p.K2.efficiency < 0 ? 'text-destructive' : ''}`}>{p.K2.total ? p.K2.efficiency.toFixed(0) + '%' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttackBreakdownView({ actions, playerNames }: { actions: DbAction[]; playerNames: Map<number, string> }) {
  const rows = useMemo(() => attackBreakdownPerPlayer(actions), [actions]);
  const [selected, setSelected] = useState<number | null>(rows[0]?.number ?? null);
  if (rows.length === 0) return <Card className="p-5 text-sm text-muted-foreground">Nessun attacco rilevato.</Card>;
  const current = rows.find(r => r.number === selected) ?? rows[0];
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-3">
      <Card className="p-2 max-h-[60vh] overflow-y-auto">
        {rows.map(r => (
          <button
            key={r.number}
            onClick={() => setSelected(r.number)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${current.number === r.number ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/40 text-muted-foreground'}`}
          >
            <span className="font-bold">#{r.number}</span> <span className="text-xs">{playerNames.get(r.number) || ''}</span>
            <span className="text-xs ml-2 text-muted-foreground">({r.total})</span>
          </button>
        ))}
      </Card>

      <div className="grid gap-3">
        <Card className="p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Per zona di partenza attacco</h3>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
              <tr><th className="text-left">Zona</th><th>Tot</th><th>Kill</th><th>Err</th><th>Kill%</th><th>Eff%</th></tr>
            </thead>
            <tbody>
              {current.byZone.map(z => (
                <tr key={z.zone} className="border-b border-border/40">
                  <td className="py-1.5 font-bold">P{z.zone}</td>
                  <td className="text-center">{z.total}</td>
                  <td className="text-center">{z.kills}</td>
                  <td className="text-center">{z.errors}</td>
                  <td className="text-center">{z.killPct.toFixed(0)}%</td>
                  <td className={`text-center font-semibold ${z.efficiency >= 30 ? 'text-emerald-500' : z.efficiency < 0 ? 'text-destructive' : ''}`}>{z.efficiency.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Per tempo di alzata</h3>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
              <tr><th className="text-left">Tempo</th><th>Tot</th><th>Kill</th><th>Err</th><th>Kill%</th><th>Eff%</th></tr>
            </thead>
            <tbody>
              {current.byTempo.map(t => (
                <tr key={t.tempo} className="border-b border-border/40">
                  <td className="py-1.5 font-bold">{t.label} <span className="text-[10px] text-muted-foreground">({t.tempo})</span></td>
                  <td className="text-center">{t.total}</td>
                  <td className="text-center">{t.kills}</td>
                  <td className="text-center">{t.errors}</td>
                  <td className="text-center">{t.killPct.toFixed(0)}%</td>
                  <td className={`text-center font-semibold ${t.efficiency >= 30 ? 'text-emerald-500' : t.efficiency < 0 ? 'text-destructive' : ''}`}>{t.efficiency.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function ReceptionXPView({ actions, playerNames }: { actions: DbAction[]; playerNames: Map<number, string> }) {
  const rows = useMemo(() => receptionExpectedPointsPerPlayer(actions), [actions]);
  if (rows.length === 0) return <Card className="p-5 text-sm text-muted-foreground">Nessuna ricezione rilevata.</Card>;
  return (
    <Card className="p-5 overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-3">
        <strong className="text-foreground">xP</strong> = expected points su ricezione. Pesi: R# 1.0 · R+ 0.8 · R! 0.5 · R- 0.2 · R/ R= 0.
      </p>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2">Atleta</th>
            <th>Ric</th>
            <th>Prf%</th>
            <th>Pos%</th>
            <th>Err%</th>
            <th>xP totale</th>
            <th>xP / ric</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.number} className="border-b border-border/40">
              <td className="py-2 font-bold">#{r.number} <span className="font-normal text-muted-foreground">{playerNames.get(r.number) || ''}</span></td>
              <td className="text-center">{r.receptions}</td>
              <td className="text-center">{r.perfectPct.toFixed(0)}%</td>
              <td className="text-center">{r.positivePct.toFixed(0)}%</td>
              <td className="text-center">{r.errorPct.toFixed(0)}%</td>
              <td className="text-center">{r.xpTotal.toFixed(1)}</td>
              <td className={`text-center font-bold ${r.xpAverage >= 0.7 ? 'text-emerald-500' : r.xpAverage < 0.4 ? 'text-destructive' : 'text-primary'}`}>{r.xpAverage.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ServePressureView({ allActions, teamId, playerNames }: { allActions: DbAction[]; teamId: string; playerNames: Map<number, string> }) {
  const rows = useMemo(() => servePressureIndexPerPlayer(allActions, teamId), [allActions, teamId]);
  if (rows.length === 0) return <Card className="p-5 text-sm text-muted-foreground">Nessuna battuta rilevata o nessuna ricezione avversaria associabile.</Card>;
  return (
    <Card className="p-5 overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-3">
        <strong className="text-foreground">Pressione%</strong> = % di ricezioni avversarie ≤ R! (cioè !, -, /, =) generate dalle battute del giocatore.
      </p>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2">Atleta</th>
            <th>Battute</th>
            <th>Ace%</th>
            <th>Err%</th>
            <th>Ric. forzate</th>
            <th>Pressanti</th>
            <th>Pressione%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.number} className="border-b border-border/40">
              <td className="py-2 font-bold">#{r.number} <span className="font-normal text-muted-foreground">{playerNames.get(r.number) || ''}</span></td>
              <td className="text-center">{r.serves}</td>
              <td className="text-center">{r.acePct.toFixed(0)}%</td>
              <td className="text-center">{r.errorPct.toFixed(0)}%</td>
              <td className="text-center">{r.receptionsForced}</td>
              <td className="text-center">{r.pressureServes}</td>
              <td className={`text-center font-bold ${r.pressurePct >= 50 ? 'text-emerald-500' : r.pressurePct < 25 ? 'text-destructive' : 'text-primary'}`}>{r.pressurePct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
