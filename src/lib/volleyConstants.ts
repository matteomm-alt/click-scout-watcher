// Costanti condivise per fondamentali e fasce d'età (FIPAV)

export const FUNDAMENTALS = [
  'Battuta',
  'Ricezione',
  'Palleggio',
  'Attacco',
  'Muro',
  'Difesa',
  'Bagher',
  'Alzata',
] as const;

export type Fundamental = typeof FUNDAMENTALS[number];

// Ruoli pallavolo (per filtro target negli allenamenti)
export const VOLLEY_ROLES = [
  'Palleggiatore',
  'Opposto',
  'Schiacciatore',
  'Centrale',
  'Libero',
  'Universale',
] as const;

export type VolleyRole = typeof VOLLEY_ROLES[number];

export const AGE_GROUPS = [
  'U12',
  'U13',
  'U14',
  'U16',
  'U18',
  'U21',
  'Senior',
  'Misto',
] as const;

export type AgeGroup = typeof AGE_GROUPS[number];

// Mappa fondamentale -> classe colore semantico (token-based)
export const FUNDAMENTAL_COLOR: Record<string, string> = {
  Battuta: 'bg-red-500/15 text-red-500 border-red-500/30',
  Ricezione: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  Palleggio: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  Attacco: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  Muro: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Difesa: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  Bagher: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
  Alzata: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
};

// Tag predefiniti raggruppati per categoria — usati da TagPicker.
// I coach possono comunque aggiungere tag liberi.
export const PREDEFINED_TAG_GROUPS: { category: string; tags: string[] }[] = [
  {
    category: 'Metodologia',
    tags: ['Analitico', 'Sintetico', 'Globale', 'Situazionale', 'Propedeutico', 'Gara'],
  },
  {
    category: 'Tipologia palla',
    tags: ['Palla corta', 'Palla lunga', 'Palla tesa', 'Palla alta', 'Pallonetto', 'Free ball'],
  },
  {
    category: 'Fase di gioco',
    tags: ['Side-out', 'Break point', 'Cambio palla', 'Contrattacco', 'Transizione', 'Difesa-attacco'],
  },
  {
    category: 'Zona campo',
    tags: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Seconda linea', 'Pipe'],
  },
  {
    category: 'Obiettivo',
    tags: ['Riscaldamento', 'Tecnica', 'Tattica', 'Fisico', 'Mentale', 'Defaticamento'],
  },
  {
    category: 'Numero atleti',
    tags: ['1 vs 1', '2 vs 2', '3 vs 3', '4 vs 4', '6 vs 6', 'Individuale', 'A coppie'],
  },
];

// Lista flat di tutti i tag predefiniti (per autocomplete rapido)
export const ALL_PREDEFINED_TAGS: string[] = PREDEFINED_TAG_GROUPS.flatMap((g) => g.tags);

// Normalizza un tag (trim + capitalizzazione iniziale) — per evitare duplicati "palla corta" vs "Palla Corta"
export function normalizeTag(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
