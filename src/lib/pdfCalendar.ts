/**
 * Stampa PDF del calendario società (settimana / mese / stagione).
 * Disponibile in versione a colori e in bianco e nero.
 */
import jsPDF from 'jspdf';
import { getPdfPalette, eventTypeColor, tint, type PdfColorMode } from './pdfTheme';

export interface CalendarPdfEvent {
  id: string;
  title: string;
  event_type: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  team_name?: string | null;
}

export interface CalendarPdfOptions {
  societyName: string;
  /** Etichetta del periodo mostrato, es. "Novembre 2026". */
  periodLabel: string;
  viewLabel: string;
  events: CalendarPdfEvent[];
  mode?: PdfColorMode;
}

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 12;
const TYPE_LABELS: Record<string, string> = {
  allenamento: 'Allenamento',
  partita: 'Partita',
  riunione: 'Riunione',
  torneo: 'Torneo',
  altro: 'Altro',
};

const COLS = [
  { key: 'date', label: 'Data', w: 40 },
  { key: 'time', label: 'Orario', w: 26 },
  { key: 'type', label: 'Tipo', w: 32 },
  { key: 'title', label: 'Evento', w: 82 },
  { key: 'team', label: 'Squadra', w: 42 },
  { key: 'place', label: 'Luogo', w: 51 },
] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function generateCalendarPdf(opts: CalendarPdfOptions): jsPDF {
  const mode = opts.mode ?? 'color';
  const p = getPdfPalette(mode);
  const doc = new jsPDF('l', 'mm', 'a4');

  const drawHeader = () => {
    doc.setFillColor(...p.dark);
    doc.rect(0, 0, PAGE_W, 22, 'F');
    doc.setFillColor(...p.accent);
    doc.rect(0, 22, PAGE_W, 1.2, 'F');
    doc.setTextColor(...p.onAccent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`CALENDARIO · ${opts.viewLabel.toUpperCase()}`, MARGIN, 9);
    doc.setFontSize(14);
    doc.text(opts.periodLabel.toUpperCase(), MARGIN, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(opts.societyName || '', PAGE_W - MARGIN, 18, { align: 'right' });
  };

  const drawTableHead = (y: number) => {
    doc.setFillColor(...p.dark);
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 7, 'F');
    doc.setTextColor(...p.onAccent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    let x = MARGIN;
    COLS.forEach((c) => {
      doc.text(c.label.toUpperCase(), x + 2, y + 4.8);
      x += c.w;
    });
    return y + 7;
  };

  drawHeader();
  let y = drawTableHead(29);

  const sorted = [...opts.events].sort((a, b) => a.start_at.localeCompare(b.start_at));

  if (sorted.length === 0) {
    doc.setTextColor(...p.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nessun evento nel periodo selezionato.', MARGIN + 2, y + 8);
  }

  let lastDay = '';
  sorted.forEach((e, i) => {
    if (y + 9 > PAGE_H - 14) {
      doc.addPage();
      drawHeader();
      y = drawTableHead(29);
      lastDay = '';
    }
    const rowH = 8;
    if (i % 2 === 1) {
      doc.setFillColor(...p.rowAlt);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, rowH, 'F');
    }
    doc.setDrawColor(...p.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

    const day = e.start_at.slice(0, 10);
    const typeCol = eventTypeColor(e.event_type, mode);
    let x = MARGIN;

    // Data (ripetuta solo al cambio giorno)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...p.dark);
    if (day !== lastDay) {
      doc.text(fmtDate(e.start_at), x + 2, y + 5.4);
      lastDay = day;
    }
    x += COLS[0].w;

    // Orario
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...p.muted);
    const time = e.end_at ? `${fmtTime(e.start_at)}–${fmtTime(e.end_at)}` : fmtTime(e.start_at);
    doc.text(time, x + 2, y + 5.4);
    x += COLS[1].w;

    // Tipo (badge)
    doc.setFillColor(...tint(typeCol, mode === 'bw' ? 0.35 : 0.22));
    doc.setDrawColor(...typeCol);
    doc.roundedRect(x + 2, y + 1.6, COLS[2].w - 6, 4.8, 1, 1, 'FD');
    doc.setTextColor(...(mode === 'bw' ? p.dark : typeCol));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(
      (TYPE_LABELS[e.event_type] ?? e.event_type).toUpperCase(),
      x + COLS[2].w / 2 - 1, y + 5,
      { align: 'center' },
    );
    x += COLS[2].w;

    // Titolo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...p.dark);
    doc.text(doc.splitTextToSize(e.title, COLS[3].w - 4)[0] ?? '', x + 2, y + 5.4);
    x += COLS[3].w;

    // Squadra
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...p.muted);
    doc.text(doc.splitTextToSize(e.team_name ?? '—', COLS[4].w - 4)[0] ?? '—', x + 2, y + 5.4);
    x += COLS[4].w;

    // Luogo
    doc.text(doc.splitTextToSize(e.location ?? '—', COLS[5].w - 4)[0] ?? '—', x + 2, y + 5.4);

    y += rowH;
  });

  // Riepilogo per tipo + footer
  const counts = sorted.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...p.muted);
    const summary = Object.entries(counts)
      .map(([t, n]) => `${TYPE_LABELS[t] ?? t}: ${n}`)
      .join('   ·   ');
    doc.text(summary || 'Nessun evento', MARGIN, PAGE_H - 7);
    doc.text(
      `Generato il ${new Date().toLocaleDateString('it-IT')} · Pag. ${i}/${pages}`,
      PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' },
    );
  }

  return doc;
}

export function downloadCalendarPdf(opts: CalendarPdfOptions) {
  const doc = generateCalendarPdf(opts);
  const slug = opts.periodLabel.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase();
  doc.save(`calendario_${slug}${opts.mode === 'bw' ? '_bn' : ''}.pdf`);
}
