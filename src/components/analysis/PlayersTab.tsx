import { type DbAction, statsByPlayer, SKILL_NAMES } from '@/lib/scoutAnalysis';
import { Card } from '@/components/ui/card';
import type { MatchRow } from './types';

export function PlayersTab({ actions, playerNames, match, teamName }: { actions: DbAction[]; playerNames: Map<number, string>; match: MatchRow; teamName: string }) {
  const players = statsByPlayer(actions);

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
    doc.text('Heatmap zone (volume azioni)', 14, y); y += 4;
    const zoneCounts: Record<number, number> = {};
    playerActions.forEach(a => {
      const z = (a.skill === 'A') ? a.end_zone : a.start_zone;
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
      doc.setFillColor(249, 115, 22, intensity * 255 as any);
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
  );
}
