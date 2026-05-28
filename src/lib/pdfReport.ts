/**
 * Report PDF partita "premium": header + scoreboard + parziali set,
 * KPI per fondamentale (entrambe squadre), top scorer/giocatori,
 * heatmap zone attacco e ricezione.
 *
 * Usa jsPDF (già in deps). Layout A4 portrait per leggibilità.
 */
import jsPDF from 'jspdf';
import {
  statsBySkill, statsByPlayer, zoneStats, SKILL_NAMES, type DbAction,
} from './scoutAnalysis';

interface MatchMeta {
  homeName: string;
  awayName: string;
  homeSetsWon: number;
  awaySetsWon: number;
  date: string | null;
  league: string | null;
  venue: string | null;
  setResults: Array<{ intermediates?: string[]; duration?: number | string }>;
  homeTeamId: string;
  awayTeamId: string;
}

interface PlayerInfo {
  scout_team_id: string;
  number: number;
  last_name: string;
  first_name: string | null;
  role: string | null;
}

const ORANGE: [number, number, number] = [249, 115, 22]; // #F97316 brand
const DARK: [number, number, number] = [17, 17, 19];
const MUTED: [number, number, number] = [120, 120, 125];
const BORDER: [number, number, number] = [220, 220, 222];

const PAGE_W = 210;
const MARGIN = 14;

function safeName(v: string) {
  return v.replace(/[^A-Za-z0-9]+/g, '').slice(0, 12).toUpperCase() || 'TEAM';
}

function checkPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > 285) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function drawHeader(doc: jsPDF, meta: MatchMeta) {
  // Top brand band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 28, PAGE_W, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REPORT PARTITA', MARGIN, 11);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = `${meta.homeName.toUpperCase()}  ${meta.homeSetsWon}-${meta.awaySetsWon}  ${meta.awayName.toUpperCase()}`;
  doc.text(title, MARGIN, 22);

  doc.setTextColor(180, 180, 185);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const meta1 = [meta.date, meta.league, meta.venue].filter(Boolean).join('  ·  ');
  doc.text(meta1, MARGIN, 26.5);
}

function drawSetBreakdown(doc: jsPDF, meta: MatchMeta, y: number): number {
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PARZIALI SET', MARGIN, y);
  y += 5;

  const cellW = 32;
  const cellH = 14;
  const startX = MARGIN;

  meta.setResults.forEach((set, i) => {
    const x = startX + i * (cellW + 3);
    if (x + cellW > PAGE_W - MARGIN) return;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, y, cellW, cellH);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(`SET ${i + 1}`, x + 2, y + 4);

    const last = set.intermediates?.[set.intermediates.length - 1] || '—';
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(last, x + cellW / 2, y + 11, { align: 'center' });

    if (set.duration) {
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(`${set.duration}'`, x + cellW - 2, y + 4, { align: 'right' });
    }
  });

  return y + cellH + 8;
}

function drawKpiTable(
  doc: jsPDF, title: string, actions: DbAction[], y: number
): number {
  y = checkPage(doc, y, 50);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  y += 5;

  const stats = statsBySkill(actions);
  if (stats.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Nessun dato.', MARGIN, y + 4);
    return y + 12;
  }

  const cols = [
    { label: 'Fondamentale', w: 50 },
    { label: 'Tot', w: 18 },
    { label: 'Pos%', w: 22 },
    { label: 'Err%', w: 22 },
    { label: 'Perf', w: 18 },
    { label: 'Eff%', w: 22 },
    { label: 'Errori', w: 25 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);

  // Header row
  doc.setFillColor(...DARK);
  doc.rect(MARGIN, y, tableW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN;
  cols.forEach(c => { doc.text(c.label, x + 2, y + 4); x += c.w; });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  stats.forEach((s, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 250);
      doc.rect(MARGIN, y, tableW, 5.5, 'F');
    }
    doc.setTextColor(...DARK);
    x = MARGIN;
    const cells = [
      SKILL_NAMES[s.skill] || s.skill,
      String(s.total),
      `${s.positivePct.toFixed(0)}%`,
      `${s.errorPct.toFixed(0)}%`,
      String(s.perfect),
      `${s.efficiency.toFixed(0)}%`,
      String(s.errors),
    ];
    cells.forEach((cell, i) => {
      if (i === 5) {
        // colorize efficiency
        const eff = s.efficiency;
        if (eff >= 30) doc.setTextColor(20, 140, 60);
        else if (eff < 0) doc.setTextColor(200, 50, 40);
        else doc.setTextColor(...DARK);
      } else {
        doc.setTextColor(...DARK);
      }
      doc.text(cell, x + 2, y + 4);
      x += cols[i].w;
    });
    y += 5.5;
  });

  return y + 6;
}

function drawTopScorers(
  doc: jsPDF, title: string, actions: DbAction[], players: PlayerInfo[], teamId: string, y: number
): number {
  y = checkPage(doc, y, 50);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  y += 5;

  // Punti per giocatore = kill di Attacco/Battuta/Muro
  const pointsBy = new Map<number, { kills: number; attErr: number; serveAce: number; blockPt: number }>();
  for (const a of actions) {
    if (a.player_number === null) continue;
    if (!pointsBy.has(a.player_number)) {
      pointsBy.set(a.player_number, { kills: 0, attErr: 0, serveAce: 0, blockPt: 0 });
    }
    const p = pointsBy.get(a.player_number)!;
    if (a.skill === 'A' && a.evaluation === '#') p.kills++;
    if (a.skill === 'A' && (a.evaluation === '=' || a.evaluation === '/')) p.attErr++;
    if (a.skill === 'S' && a.evaluation === '#') p.serveAce++;
    if (a.skill === 'B' && a.evaluation === '#') p.blockPt++;
  }

  const rows = [...pointsBy.entries()]
    .map(([num, p]) => {
      const info = players.find(pl => pl.scout_team_id === teamId && pl.number === num);
      const total = p.kills + p.serveAce + p.blockPt;
      return {
        num,
        name: info ? `${info.last_name}${info.first_name ? ' ' + info.first_name.charAt(0) + '.' : ''}` : `#${num}`,
        role: info?.role || '',
        total, ...p,
      };
    })
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Nessun punto registrato.', MARGIN, y + 4);
    return y + 12;
  }

  const cols = [
    { label: '#', w: 10 },
    { label: 'Giocatore', w: 55 },
    { label: 'Ruolo', w: 18 },
    { label: 'Punti', w: 16 },
    { label: 'Att Kill', w: 20 },
    { label: 'Att Err', w: 20 },
    { label: 'Ace', w: 15 },
    { label: 'Muro Pt', w: 22 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);

  doc.setFillColor(...DARK);
  doc.rect(MARGIN, y, tableW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = MARGIN;
  cols.forEach(c => { doc.text(c.label, x + 2, y + 4); x += c.w; });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rows.forEach((r, idx) => {
    if (idx === 0) {
      doc.setFillColor(...ORANGE);
      doc.rect(MARGIN, y, tableW, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
    } else {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 250);
        doc.rect(MARGIN, y, tableW, 5.5, 'F');
      }
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
    }
    x = MARGIN;
    const cells = [String(r.num), r.name, r.role, String(r.total), String(r.kills), String(r.attErr), String(r.serveAce), String(r.blockPt)];
    const rowH = idx === 0 ? 6 : 5.5;
    cells.forEach((cell, i) => { doc.text(cell, x + 2, y + 4); x += cols[i].w; });
    y += rowH;
  });

  return y + 6;
}

// Layout zone DataVolley:
//   4 3 2
//   7 8 9
//   5 6 1
const ZONE_GRID: number[][] = [[4, 3, 2], [7, 8, 9], [5, 6, 1]];

function drawHeatmap(
  doc: jsPDF, title: string, actions: DbAction[], which: 'start' | 'end', x0: number, y0: number
): number {
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, x0, y0);
  let y = y0 + 4;

  const stats = zoneStats(actions, which);
  const max = Math.max(1, ...stats.map(s => s.total));
  const cellSize = 22;
  const gridW = cellSize * 3;
  const gridH = cellSize * 3;

  // Net line
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(x0, y, x0 + gridW, y);
  doc.setLineWidth(0.3);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const zone = ZONE_GRID[r][c];
      const stat = stats.find(s => s.zone === zone)!;
      const intensity = stat.total / max;
      // Orange gradient bg
      const alpha = Math.min(0.85, 0.15 + intensity * 0.7);
      const bg: [number, number, number] = [
        Math.round(255 - (255 - ORANGE[0]) * alpha),
        Math.round(255 - (255 - ORANGE[1]) * alpha),
        Math.round(255 - (255 - ORANGE[2]) * alpha),
      ];
      doc.setFillColor(...bg);
      doc.rect(x0 + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
      doc.setDrawColor(...BORDER);
      doc.rect(x0 + c * cellSize, y + r * cellSize, cellSize, cellSize);

      doc.setTextColor(...MUTED);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Z${zone}`, x0 + c * cellSize + 1.5, y + r * cellSize + 3.5);

      if (stat.total > 0) {
        doc.setTextColor(...DARK);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.total), x0 + c * cellSize + cellSize / 2, y + r * cellSize + cellSize / 2 + 1, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(`${stat.efficiency.toFixed(0)}%`, x0 + c * cellSize + cellSize / 2, y + r * cellSize + cellSize - 2, { align: 'center' });
      }
    }
  }

  return y + gridH + 6;
}

function drawFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 292, PAGE_W - MARGIN, 292);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const date = new Date().toLocaleDateString('it-IT');
    doc.text(`Generato il ${date}`, MARGIN, 295);
    doc.text(`Pag. ${i} / ${pages}`, PAGE_W - MARGIN, 295, { align: 'right' });
  }
}

export function generateMatchReport(
  meta: MatchMeta,
  actions: DbAction[],
  players: PlayerInfo[],
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');

  // === Page 1: header + parziali + KPI ===
  drawHeader(doc, meta);
  let y = 38;
  y = drawSetBreakdown(doc, meta, y);

  const homeActs = actions.filter(a => a.scout_team_id === meta.homeTeamId);
  const awayActs = actions.filter(a => a.scout_team_id === meta.awayTeamId);

  y = drawKpiTable(doc, `KPI · ${meta.homeName.toUpperCase()}`, homeActs, y);
  y = drawKpiTable(doc, `KPI · ${meta.awayName.toUpperCase()}`, awayActs, y);

  // === Page 2: top scorer ===
  doc.addPage();
  drawHeader(doc, meta);
  y = 38;
  y = drawTopScorers(doc, `TOP SCORER · ${meta.homeName.toUpperCase()}`, homeActs, players, meta.homeTeamId, y);
  y = drawTopScorers(doc, `TOP SCORER · ${meta.awayName.toUpperCase()}`, awayActs, players, meta.awayTeamId, y);

  // === Page 3: heatmap ===
  doc.addPage();
  drawHeader(doc, meta);
  y = 38;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`HEATMAP ZONE · ${meta.homeName.toUpperCase()}`, MARGIN, y);
  y += 6;
  const homeAttack = homeActs.filter(a => a.skill === 'A');
  const homeRec = homeActs.filter(a => a.skill === 'R');
  drawHeatmap(doc, 'Attacco (zona arrivo)', homeAttack, 'end', MARGIN, y);
  drawHeatmap(doc, 'Ricezione (zona partenza)', homeRec, 'start', MARGIN + 90, y);

  y += 80;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`HEATMAP ZONE · ${meta.awayName.toUpperCase()}`, MARGIN, y);
  y += 6;
  const awayAttack = awayActs.filter(a => a.skill === 'A');
  const awayRec = awayActs.filter(a => a.skill === 'R');
  drawHeatmap(doc, 'Attacco (zona arrivo)', awayAttack, 'end', MARGIN, y);
  drawHeatmap(doc, 'Ricezione (zona partenza)', awayRec, 'start', MARGIN + 90, y);

  drawFooter(doc);
  return doc;
}

export function downloadMatchReport(
  meta: MatchMeta,
  actions: DbAction[],
  players: PlayerInfo[],
) {
  const doc = generateMatchReport(meta, actions, players);
  const date = meta.date || new Date().toISOString().slice(0, 10);
  doc.save(`report_${safeName(meta.homeName)}_${safeName(meta.awayName)}_${date}.pdf`);
}

// ============================================================
// P14 — Scheda atleta PDF
// ============================================================
export interface AthleteCardData {
  firstName: string | null;
  lastName: string;
  number: number | null;
  role: string | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  team: string | null;
  isLibero: boolean;
  isCaptain: boolean;
  medicalCertExpiry: string | null;
  notes: string | null;
  attendancePct?: number | null;
  presences?: number;
  totalEvents?: number;
  evaluations?: Array<{ fundamental: string; score: number; date: string }>;
  injuries?: Array<{ bodyPart: string; severity: string; status: string; startDate: string }>;
  societyName?: string | null;
}

export function generateAthleteCard(data: AthleteCardData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 36, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 36, PAGE_W, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text((data.societyName || 'VOLLEYSCOUT PRO').toUpperCase(), MARGIN, 12);
  doc.setFontSize(22);
  doc.text('SCHEDA ATLETA', MARGIN, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, PAGE_W - MARGIN, 12, { align: 'right' });

  let y = 50;
  // Identità
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const fullName = `${data.lastName.toUpperCase()}${data.firstName ? ' ' + data.firstName : ''}`;
  doc.text(fullName, MARGIN, y);
  if (data.number !== null) {
    doc.setTextColor(...ORANGE);
    doc.setFontSize(28);
    doc.text(`#${data.number}`, PAGE_W - MARGIN, y, { align: 'right' });
  }
  y += 8;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const badges: string[] = [];
  if (data.role) badges.push(data.role);
  if (data.isLibero) badges.push('Libero');
  if (data.isCaptain) badges.push('Capitano');
  if (data.team) badges.push(data.team);
  doc.text(badges.join(' · ') || '—', MARGIN, y);
  y += 10;

  // Tabella info
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  const fields: Array<[string, string]> = [
    ['Data di nascita', data.birthDate || '—'],
    ['Email', data.email || '—'],
    ['Telefono', data.phone || '—'],
    ['Cert. medico', data.medicalCertExpiry || '—'],
  ];
  doc.setFontSize(9);
  for (const [k, v] of fields) {
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), MARGIN, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(v, MARGIN + 45, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
  }
  y += 4;

  // Presenze
  if (data.attendancePct !== undefined && data.attendancePct !== null) {
    y = checkPage(doc, y, 30);
    doc.setFillColor(...ORANGE);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PRESENZE', MARGIN + 6, y + 5);
    y += 10;
    doc.setFontSize(28);
    doc.setTextColor(...ORANGE);
    doc.text(`${Math.round(data.attendancePct)}%`, MARGIN, y);
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.presences ?? 0} / ${data.totalEvents ?? 0} eventi`, MARGIN + 35, y - 2);
    y += 8;
  }

  // Valutazioni
  if (data.evaluations && data.evaluations.length > 0) {
    y = checkPage(doc, y, 30);
    doc.setFillColor(...ORANGE);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('VALUTAZIONI RECENTI', MARGIN + 6, y + 5);
    y += 9;
    doc.setFontSize(9);
    for (const e of data.evaluations.slice(0, 10)) {
      y = checkPage(doc, y, 6);
      doc.setTextColor(...MUTED);
      doc.text(e.date, MARGIN, y);
      doc.setTextColor(...DARK);
      doc.text(e.fundamental, MARGIN + 28, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ORANGE);
      doc.text(e.score.toFixed(1), PAGE_W - MARGIN, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 5;
    }
    y += 4;
  }

  // Infortuni
  if (data.injuries && data.injuries.length > 0) {
    y = checkPage(doc, y, 25);
    doc.setFillColor(...ORANGE);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INFORTUNI', MARGIN + 6, y + 5);
    y += 9;
    doc.setFontSize(9);
    for (const i of data.injuries.slice(0, 8)) {
      y = checkPage(doc, y, 6);
      doc.setTextColor(...MUTED);
      doc.text(i.startDate, MARGIN, y);
      doc.setTextColor(...DARK);
      doc.text(`${i.bodyPart} (${i.severity})`, MARGIN + 28, y);
      doc.setTextColor(i.status === 'attivo' ? (ORANGE as any) : (MUTED as any));
      doc.text(i.status, PAGE_W - MARGIN, y, { align: 'right' });
      y += 5;
    }
    y += 4;
  }

  if (data.notes) {
    y = checkPage(doc, y, 20);
    doc.setFillColor(...ORANGE);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('NOTE', MARGIN + 6, y + 5);
    y += 9;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(data.notes, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('VolleyScout Pro · Scheda atleta riservata', PAGE_W / 2, 290, { align: 'center' });

  return doc;
}

export function downloadAthleteCard(data: AthleteCardData) {
  const doc = generateAthleteCard(data);
  doc.save(`scheda_${safeName(data.lastName)}${data.number ?? ''}.pdf`);
}
