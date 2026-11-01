/** Scadenze amministrative degli atleti: tipi, stato e righe per la pagina "Scadenze". */

export type DeadlineKind = 'medical_cert' | 'federation_card' | 'insurance' | 'enrollment';
export type DeadlineStatus = 'scaduto' | 'in_scadenza' | 'ok' | 'mancante';

export const DEADLINE_LABELS: Record<DeadlineKind, string> = {
  medical_cert: 'Certificato medico',
  federation_card: 'Tessera federale',
  insurance: 'Assicurazione',
  enrollment: 'Rinnovo iscrizione',
};

/** Giorni di preavviso prima della scadenza. */
export const WARNING_DAYS = 30;

export interface AthleteAdminData {
  athlete_id: string;
  society_id: string;
  tax_code: string | null;
  birth_place: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  federation_card_number: string | null;
  federation_card_expiry: string | null;
  insurance_expiry: string | null;
  enrollment_renewal_date: string | null;
  admin_notes: string | null;
}

export interface AthleteBase {
  id: string;
  first_name: string | null;
  last_name: string;
  team_id: string | null;
  medical_cert_expiry: string | null;
}

export interface DeadlineRow {
  athleteId: string;
  athleteName: string;
  teamId: string | null;
  kind: DeadlineKind;
  date: string | null;
  status: DeadlineStatus;
  /** Giorni alla scadenza (negativo se scaduta), null se manca la data. */
  days: number | null;
}

/** Differenza in giorni di calendario tra una data ISO (YYYY-MM-DD) e oggi, senza effetti di fuso orario. */
export function daysUntil(dateIso: string, today: Date = new Date()): number {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

export function deadlineStatus(dateIso: string | null | undefined, today: Date = new Date()): DeadlineStatus {
  if (!dateIso) return 'mancante';
  const n = daysUntil(dateIso, today);
  if (n < 0) return 'scaduto';
  if (n <= WARNING_DAYS) return 'in_scadenza';
  return 'ok';
}

/** Una riga per atleta e per tipo di scadenza. */
export function buildDeadlineRows(
  athletes: AthleteBase[],
  admin: AthleteAdminData[],
  today: Date = new Date(),
): DeadlineRow[] {
  const byAthlete = new Map(admin.map((a) => [a.athlete_id, a]));
  const rows: DeadlineRow[] = [];
  for (const a of athletes) {
    const ad = byAthlete.get(a.id);
    const name = [a.last_name, a.first_name].filter(Boolean).join(' ');
    const dates: Record<DeadlineKind, string | null> = {
      medical_cert: a.medical_cert_expiry,
      federation_card: ad?.federation_card_expiry ?? null,
      insurance: ad?.insurance_expiry ?? null,
      enrollment: ad?.enrollment_renewal_date ?? null,
    };
    (Object.keys(dates) as DeadlineKind[]).forEach((kind) => {
      const date = dates[kind];
      rows.push({
        athleteId: a.id, athleteName: name, teamId: a.team_id, kind, date,
        status: deadlineStatus(date, today),
        days: date ? daysUntil(date, today) : null,
      });
    });
  }
  return rows;
}

const ORDER: Record<DeadlineStatus, number> = { scaduto: 0, in_scadenza: 1, mancante: 2, ok: 3 };

/** Ordina per urgenza: scaduti, in scadenza (dal piu' vicino), mancanti, regolari. */
export function sortByUrgency(rows: DeadlineRow[]): DeadlineRow[] {
  return [...rows].sort((a, b) =>
    ORDER[a.status] - ORDER[b.status]
    || (a.days ?? 9e9) - (b.days ?? 9e9)
    || a.athleteName.localeCompare(b.athleteName, 'it'));
}

/** CSV con separatore ';' (apribile direttamente in Excel in italiano). */
export function deadlinesToCsv(rows: DeadlineRow[], teamName: (id: string | null) => string): string {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const status: Record<DeadlineStatus, string> = {
    scaduto: 'Scaduto', in_scadenza: 'In scadenza', ok: 'Regolare', mancante: 'Mancante',
  };
  const head = ['Atleta', 'Squadra', 'Scadenza', 'Data', 'Stato', 'Giorni'].join(';');
  const body = rows.map((r) => [
    r.athleteName, teamName(r.teamId), DEADLINE_LABELS[r.kind],
    r.date ? r.date.slice(0, 10).split('-').reverse().join('/') : '',
    status[r.status], r.days === null ? '' : String(r.days),
  ].map(esc).join(';'));
  return [head, ...body].join('\n');
}
