export const FONDAMENTALI_DEFAULT = [
  { id: 'f1', nome: 'Palleggio', subAspetti: [
    'Posizione delle mani e delle dita',
    'Posizione del corpo sotto la palla',
    'Precisione della direzione',
    'Gestione del ritmo e del tempo',
    'Palleggio in salto',
  ]},
  { id: 'f2', nome: 'Bagher di appoggio', subAspetti: [
    'Piano di rimbalzo (superficie piatta)',
    'Postura e baricentro basso',
    'Estensione delle braccia al contatto',
    'Direzione verso alzatrice',
  ]},
  { id: 'f3', nome: 'Bagher di difesa', subAspetti: [
    "Lettura della traiettoria d'attacco",
    'Reattività e velocità di spostamento',
    'Gestione degli angoli (diagonale/lungolinea)',
    'Difesa in tuffo / pancata',
    'Recupero posturale post-difesa',
  ]},
  { id: 'f4', nome: 'Ricezione', subAspetti: [
    'Posizione di attesa e lettura del servizio',
    'Spostamento in anticipo',
    'Piano di rimbalzo sulla traiettoria',
    'Precisione verso zona alzata (2-3)',
    'Gestione del float / topspin',
  ]},
  { id: 'f5', nome: 'Bagher di alzata', subAspetti: [
    'Utilizzo in emergenza',
    'Qualità del palleggio di seconda intenzione',
    "Direzione verso l'attaccante",
  ]},
  { id: 'f6', nome: 'Rincorsa e stacco', subAspetti: [
    'Ritmo dei passi (3 o 4 passi)',
    'Velocità di approccio',
    'Stacco e caricamento delle braccia',
    "Timing rispetto all'alzata",
  ]},
  { id: 'f7', nome: 'Attacco', subAspetti: [
    'Coordinazione braccio-corpo in salto',
    'Potenza del colpo',
    'Gestione palla (posto 4 / posto 2 / pipe)',
    'Varianti (pallonetto, pipe, buca)',
    'Mano aperta e chiusura del polso',
  ]},
  { id: 'f8', nome: 'Battuta', subAspetti: [
    'Float da fondo (precisione zona)',
    'Float in salto',
    'Topspin',
    'Consistenza e % errore',
    'Capacità tattica (zona debole)',
  ]},
  { id: 'f9', nome: 'Muro', subAspetti: [
    "Lettura dell'alzata",
    'Timing di stacco',
    'Penetrazione delle mani oltre la rete',
    'Copertura laterale (muro di ala)',
    'Comunicazione con i compagni',
  ]},
] as const;

/**
 * Restituisce il nome visualizzato di un sub-aspetto standard,
 * usando il rename personalizzato se presente.
 */
export function getSubAspectLabel(
  fondId: string,
  subIndex: number,
  defaultName: string,
  renamedMap: Record<string, string> | undefined,
): string {
  const key = `${fondId}_${subIndex}`;
  return renamedMap?.[key] ?? defaultName;
}
