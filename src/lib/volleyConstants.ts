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
