/**
 * Definizione centrale dei moduli (features) di una società.
 * Le chiavi corrispondono a quelle salvate nel campo `societies.features` (jsonb).
 *
 * Regola: se il flag NON è presente nel jsonb, il modulo è considerato ATTIVO di default.
 */

export type FeatureKey =
  | 'athletes'
  | 'exercises'
  | 'training_calendar'
  | 'communications'
  | 'advanced_stats'
  | 'live_scout'
  | 'guidelines'
  | 'dvw_export'
  | 'video_analysis'
  | 'injuries';

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  group: 'Scout' | 'Coaching' | 'Atleti' | 'Gestionale' | 'Analisi';
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'live_scout',
    label: 'Scout Live',
    description: 'Scouting partite in tempo reale con tastiera e statistiche istantanee.',
    group: 'Scout',
  },
  {
    key: 'advanced_stats',
    label: 'Archivio & Analisi DVW',
    description: 'Importazione file DVW, archivio partite e analisi avanzate per set/rotazione.',
    group: 'Analisi',
  },
  {
    key: 'dvw_export',
    label: 'Esportazione DVW',
    description: 'Esportazione delle partite scoutate in formato DataVolley (.dvw).',
    group: 'Scout',
  },
  {
    key: 'video_analysis',
    label: 'Analisi Video',
    description: 'Sincronizzazione video partita con eventi scout (in arrivo).',
    group: 'Analisi',
  },
  {
    key: 'athletes',
    label: 'Atleti & Magazzino',
    description: 'Anagrafica atleti, valutazioni tecniche e inventario materiali.',
    group: 'Atleti',
  },
  {
    key: 'exercises',
    label: 'Esercizi & Allenamenti',
    description: 'Libreria esercizi e creazione sessioni di allenamento.',
    group: 'Coaching',
  },
  {
    key: 'training_calendar',
    label: 'Pianificazione Stagionale',
    description: 'Scheletri, schemi, periodizzazione, pianificazione e volume di allenamento.',
    group: 'Coaching',
  },
  {
    key: 'guidelines',
    label: 'Guida Tecnica',
    description: 'Linee guida tecniche e didattica condivisa nella società.',
    group: 'Coaching',
  },
  {
    key: 'communications',
    label: 'Comunicazioni',
    description: 'Bacheca comunicazioni interne con priorità e lettura.',
    group: 'Gestionale',
  },
  {
    key: 'injuries',
    label: 'Gestione Infortuni',
    description: 'Storico infortuni atleti, recupero, integrazione con presenze.',
    group: 'Atleti',
  },
];

export type FeaturesMap = Partial<Record<FeatureKey, boolean>> & Record<string, unknown>;

/**
 * Ritorna lo stato di un singolo modulo.
 * Se la chiave NON è presente nel jsonb → true (default attivo).
 */
export function isFeatureEnabled(features: FeaturesMap | null | undefined, key: FeatureKey): boolean {
  if (!features) return true;
  const v = features[key];
  if (v === undefined || v === null) return true;
  return !!v;
}
