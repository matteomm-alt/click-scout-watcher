import type { LucideIcon } from 'lucide-react';
import {
  Home, FileUp, Activity, Library,
  Calendar, ClipboardCheck, ListChecks, Megaphone, Package,
  Dumbbell, ClipboardList, LayoutTemplate, GitBranch, BarChart3, Target, LayoutGrid, BookOpen,
  PieChart, UserCircle, Star, HeartPulse, Shield, Boxes, FileSpreadsheet,
} from 'lucide-react';
import type { FeatureKey } from '@/lib/societyFeatures';

/**
 * Struttura unica di navigazione: usata da sidebar, Home e pagina "Personalizza".
 * Tre blocchi — Tecnica, Scouting, Gestionale — più una zona "Generale" fissa.
 */
export type BlockId = 'tecnica' | 'scouting' | 'gestionale';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Se presente, la voce è visibile solo se la feature è attiva per la società. */
  feature?: FeatureKey;
  badgeKey?: 'comunicazioni' | 'presenze' | 'convocazioni';
}

export interface BlockDef {
  id: BlockId;
  label: string;
  description: string;
  /** Classi Tailwind statiche (non costruibili dinamicamente) per l'accento del blocco. */
  text: string;
  border: string;
  bg: string;
  dot: string;
  items: NavItem[];
}

export const BLOCK_IDS: BlockId[] = ['tecnica', 'scouting', 'gestionale'];

/** Voci sempre in alto, fuori dai tre blocchi. Home non si può nascondere. */
export const HOME_ITEM: NavItem = { title: 'Home', url: '/', icon: Home };
export const GENERAL_ITEMS: NavItem[] = [
  { title: 'Atleti', url: '/atleti', icon: UserCircle, feature: 'athletes' },
];

export const BLOCKS: Record<BlockId, BlockDef> = {
  tecnica: {
    id: 'tecnica',
    label: 'Tecnica',
    description: 'Allenamenti, programmazione, obiettivi e preparazione degli atleti.',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/5',
    dot: 'bg-sky-500',
    items: [
      { title: 'Esercizi', url: '/esercizi', icon: Dumbbell, feature: 'exercises' },
      { title: 'Allenamenti', url: '/allenamenti', icon: ClipboardList, feature: 'exercises' },
      { title: 'Scheletri', url: '/scheletri', icon: LayoutTemplate, feature: 'training_calendar' },
      { title: 'Schemi', url: '/schemi', icon: GitBranch, feature: 'training_calendar' },
      { title: 'Volume', url: '/volume', icon: BarChart3, feature: 'training_calendar' },
      { title: 'Programmazione', url: '/programmazione', icon: LayoutGrid, feature: 'training_calendar' },
      { title: 'Obiettivi', url: '/obiettivi', icon: Target },
      { title: 'Valutazioni', url: '/valutazioni', icon: Star, feature: 'athletes' },
      { title: 'Infortuni', url: '/infortuni', icon: HeartPulse, feature: 'injuries' },
      { title: 'Guida Tecnica', url: '/guida-tecnica', icon: BookOpen, feature: 'guidelines' },
    ],
  },
  scouting: {
    id: 'scouting',
    label: 'Scouting',
    description: 'Scout live, import DVW, archivio partite e analisi.',
    text: 'text-orange-700 dark:text-primary',
    border: 'border-primary/40',
    bg: 'bg-primary/5',
    dot: 'bg-primary',
    items: [
      { title: 'Scout Live', url: '/scout', icon: Activity, feature: 'live_scout' },
      { title: 'Importa DVW', url: '/import', icon: FileUp, feature: 'advanced_stats' },
      { title: 'Archivio', url: '/archive', icon: Library, feature: 'advanced_stats' },
      { title: 'Report Stagione', url: '/report-stagione', icon: PieChart, feature: 'advanced_stats' },
      { title: 'Profilo Avversario', url: '/profilo-avversario', icon: Shield, feature: 'advanced_stats' },
    ],
  },
  gestionale: {
    id: 'gestionale',
    label: 'Gestionale',
    description: 'Calendario, presenze, convocazioni, comunicazioni e materiali.',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    dot: 'bg-emerald-500',
    items: [
      { title: 'Calendario', url: '/calendario', icon: Calendar },
      { title: 'Presenze', url: '/presenze', icon: ClipboardCheck, badgeKey: 'presenze' },
      { title: 'Convocazioni', url: '/convocazioni', icon: ListChecks, badgeKey: 'convocazioni' },
      { title: 'Comunicazioni', url: '/comunicazioni', icon: Megaphone, feature: 'communications', badgeKey: 'comunicazioni' },
      { title: 'Magazzino', url: '/magazzino', icon: Package, feature: 'athletes' },
      { title: 'Inventario', url: '/inventario', icon: Boxes, feature: 'athletes' },
      { title: 'Import Excel', url: '/importa-dati', icon: FileSpreadsheet },
    ],
  },
};
