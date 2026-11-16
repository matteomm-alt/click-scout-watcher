import { supabase } from '@/integrations/supabase/client';

export interface AttendanceSummaryRow {
  athlete_id: string;
  presenti: number;
  ritardi: number;
  assenti: number;
  giustificati: number;
  totale: number;
}

/** Percentuale intera; 0 se non ci sono rilevazioni. */
export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * Conteggio presenze per atleta fatto dal database (una riga per atleta),
 * senza il limite di 1000 righe. Filtra per stagione; le righe senza stagione
 * (dati vecchi) sono incluse.
 */
export async function fetchAttendanceSummary(societyId: string, season: string | null): Promise<AttendanceSummaryRow[]> {
  // La funzione è stata aggiunta con la migrazione 20261116140000: non è ancora nei tipi generati.
  const rpc = supabase.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: AttendanceSummaryRow[] | null; error: { message: string } | null }>;
  const { data, error } = await rpc('attendance_summary', { _society_id: societyId, _season: season });
  if (error) throw new Error(error.message);
  return data ?? [];
}
