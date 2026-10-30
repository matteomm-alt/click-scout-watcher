import type { FeatureKey } from '@/lib/societyFeatures';
import { BLOCK_IDS, type BlockId } from '@/lib/navConfig';

/** Catalogo delle card della Home. Il rendering vive in components/home/HomeBlocks. */
export type HomeCardId =
  | 'next_training' | 'recent_trainings' | 'objectives' | 'injuries'
  | 'last_match' | 'kpi_dvw' | 'scout_live' | 'import_dvw' | 'archive' | 'season_report'
  | 'next_event' | 'attendance_alerts' | 'certificates' | 'pending_invites';

export interface HomeCardDef {
  id: HomeCardId;
  block: BlockId;
  label: string;
  description: string;
  feature?: FeatureKey;
  /** Visibile solo agli amministratori della società. */
  adminOnly?: boolean;
}

export const HOME_CARDS: HomeCardDef[] = [
  // Tecnica
  { id: 'next_training', block: 'tecnica', label: 'Prossimo allenamento', description: 'Il primo allenamento in programma.', feature: 'exercises' },
  { id: 'objectives', block: 'tecnica', label: 'Obiettivi in corso', description: 'Obiettivi aperti o in corso.' },
  { id: 'injuries', block: 'tecnica', label: 'Infortuni attivi', description: 'Atleti infortunati o in recupero.', feature: 'injuries' },
  { id: 'recent_trainings', block: 'tecnica', label: 'Ultimi allenamenti', description: 'Gli ultimi allenamenti registrati.', feature: 'exercises' },
  // Scouting
  { id: 'last_match', block: 'scouting', label: 'Ultima partita', description: 'Esito dell\'ultima partita con link all\'analisi.', feature: 'advanced_stats' },
  { id: 'kpi_dvw', block: 'scouting', label: 'KPI stagione', description: 'Partite, vittorie e percentuale di vittorie.', feature: 'advanced_stats' },
  { id: 'scout_live', block: 'scouting', label: 'Scout Live', description: 'Avvia uno scouting dal vivo.', feature: 'live_scout' },
  { id: 'import_dvw', block: 'scouting', label: 'Importa DVW', description: 'Carica un file DataVolley.', feature: 'advanced_stats' },
  { id: 'archive', block: 'scouting', label: 'Archivio', description: 'Squadre e partite importate.', feature: 'advanced_stats' },
  { id: 'season_report', block: 'scouting', label: 'Report Stagione', description: 'Statistiche complete e PDF.', feature: 'advanced_stats' },
  // Gestionale
  { id: 'next_event', block: 'gestionale', label: 'Prossimi eventi', description: 'I prossimi eventi del calendario.' },
  { id: 'attendance_alerts', block: 'gestionale', label: 'Allerte presenze', description: 'Atleti sotto il 70% di presenze.' },
  { id: 'certificates', block: 'gestionale', label: 'Certificati in scadenza', description: 'Certificati medici scaduti o in scadenza a 30 giorni.', feature: 'athletes' },
  { id: 'pending_invites', block: 'gestionale', label: 'Inviti pendenti', description: 'Inviti non ancora accettati.', adminOnly: true },
];

export const CARD_BY_ID: Record<HomeCardId, HomeCardDef> = Object.fromEntries(
  HOME_CARDS.map((c) => [c.id, c]),
) as Record<HomeCardId, HomeCardDef>;

export const cardsOfBlock = (block: BlockId) => HOME_CARDS.filter((c) => c.block === block);

/** Card mostrate di default per blocco (le prime 4 del catalogo, nell'ordine sopra). */
export const DEFAULT_CARDS: Record<BlockId, HomeCardId[]> = {
  tecnica: ['next_training', 'objectives', 'injuries', 'recent_trainings'],
  scouting: ['last_match', 'kpi_dvw', 'scout_live', 'import_dvw'],
  gestionale: ['next_event', 'attendance_alerts', 'certificates', 'pending_invites'],
};

export const MIN_VISIBLE = 2;
export const MAX_VISIBLE = 8;
export const DEFAULT_VISIBLE = 4;

export interface BlockHomePrefs {
  /** Card scelte, nell'ordine in cui compaiono. */
  cards: HomeCardId[];
  /** Quante card mostrare prima di "Mostra altre". */
  max: number;
}

export interface UserPrefs {
  blockOrder: BlockId[];
  hiddenBlocks: BlockId[];
  /** URL delle voci di menu nascoste. */
  hiddenItems: string[];
  home: Record<BlockId, BlockHomePrefs>;
}

export function defaultPrefs(): UserPrefs {
  return {
    blockOrder: [...BLOCK_IDS],
    hiddenBlocks: [],
    hiddenItems: [],
    home: {
      tecnica: { cards: [...DEFAULT_CARDS.tecnica], max: DEFAULT_VISIBLE },
      scouting: { cards: [...DEFAULT_CARDS.scouting], max: DEFAULT_VISIBLE },
      gestionale: { cards: [...DEFAULT_CARDS.gestionale], max: DEFAULT_VISIBLE },
    },
  };
}

const isBlock = (v: unknown): v is BlockId => typeof v === 'string' && (BLOCK_IDS as string[]).includes(v);

/** Normalizza un JSON arbitrario (da DB o localStorage) in preferenze valide. */
export function sanitizePrefs(raw: unknown): UserPrefs {
  const base = defaultPrefs();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.blockOrder)) {
    const seen = r.blockOrder.filter(isBlock).filter((b, i, a) => a.indexOf(b) === i);
    base.blockOrder = [...seen, ...BLOCK_IDS.filter((b) => !seen.includes(b))];
  }
  if (Array.isArray(r.hiddenBlocks)) base.hiddenBlocks = r.hiddenBlocks.filter(isBlock);
  if (Array.isArray(r.hiddenItems)) {
    base.hiddenItems = r.hiddenItems.filter((u): u is string => typeof u === 'string' && u !== '/');
  }
  if (r.home && typeof r.home === 'object') {
    const home = r.home as Record<string, unknown>;
    for (const b of BLOCK_IDS) {
      const h = home[b] as Partial<BlockHomePrefs> | undefined;
      if (!h || typeof h !== 'object') continue;
      if (Array.isArray(h.cards)) {
        const valid = h.cards.filter(
          (id): id is HomeCardId => typeof id === 'string' && id in CARD_BY_ID && CARD_BY_ID[id as HomeCardId].block === b,
        );
        base.home[b].cards = valid.filter((id, i, a) => a.indexOf(id) === i);
      }
      if (typeof h.max === 'number') {
        base.home[b].max = Math.min(MAX_VISIBLE, Math.max(MIN_VISIBLE, Math.round(h.max)));
      }
    }
  }
  return base;
}
