/**
 * Costanti e helper per il modulo "Gestione infortuni".
 */

export type InjurySeverity = 'lieve' | 'media' | 'grave';
export type InjuryStatus = 'attivo' | 'in_recupero' | 'risolto';

export interface AthleteInjury {
  id: string;
  society_id: string;
  athlete_id: string;
  recorded_by: string;
  body_part: string;
  injury_type: string | null;
  severity: InjurySeverity;
  status: InjuryStatus;
  start_date: string;          // ISO yyyy-mm-dd
  expected_return_date: string | null;
  actual_return_date: string | null;
  doctor_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Parti del corpo standardizzate (con possibilità di testo libero in form). */
export const BODY_PARTS = [
  'Caviglia',
  'Ginocchio',
  'Coscia',
  'Polpaccio',
  'Anca',
  'Schiena lombare',
  'Schiena dorsale',
  'Spalla',
  'Gomito',
  'Polso',
  'Dito mano',
  'Testa',
  'Altro',
] as const;

export const INJURY_TYPES = [
  'Distorsione',
  'Stiramento',
  'Strappo muscolare',
  'Contrattura',
  'Contusione',
  'Frattura',
  'Tendinopatia',
  'Lussazione',
  'Trauma cranico',
  'Altro',
] as const;

export const SEVERITY_LABEL: Record<InjurySeverity, string> = {
  lieve: 'Lieve',
  media: 'Media',
  grave: 'Grave',
};

export const STATUS_LABEL: Record<InjuryStatus, string> = {
  attivo: 'Attivo',
  in_recupero: 'In recupero',
  risolto: 'Risolto',
};

/** Tailwind class per badge di gravità (token semantici). */
export const SEVERITY_BADGE: Record<InjurySeverity, string> = {
  lieve: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30',
  media: 'bg-orange-500/15 text-orange-500 border border-orange-500/30',
  grave: 'bg-destructive/15 text-destructive border border-destructive/30',
};

export const STATUS_BADGE: Record<InjuryStatus, string> = {
  attivo: 'bg-destructive/15 text-destructive border border-destructive/30',
  in_recupero: 'bg-orange-500/15 text-orange-500 border border-orange-500/30',
  risolto: 'bg-green-500/15 text-green-500 border border-green-500/30',
};

/**
 * Conta giorni di stop dall'inizio infortunio.
 */
export function daysSince(startDate: string, endDate?: string | null): number {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 86400000));
}
