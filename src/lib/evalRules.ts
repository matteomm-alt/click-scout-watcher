/**
 * Regole di valutazione condivise dalle analisi (Data Volley / Volley Studio).
 *
 *  - "=" è l'errore su qualsiasi fondamentale.
 *  - "/" chiude l'azione contro chi tocca solo per Attacco (murato) e Muro.
 *    Per Battuta è un esito positivo (la ricezione non può attaccare),
 *    per Ricezione, Difesa, Alzata e Freeball è un esito molto negativo
 *    ma l'azione continua.
 */
export function isErrorEval(skill: string, evaluation: string): boolean {
  if (evaluation === '=') return true;
  return evaluation === '/' && (skill === 'A' || skill === 'B');
}

/** Battuta '/': positiva (non è ace né errore). */
export function isPositiveServeSlash(skill: string, evaluation: string): boolean {
  return skill === 'S' && evaluation === '/';
}

interface RallyAction {
  skill: string;
  evaluation: string;
  side: 'home' | 'away';
  skill_type?: string | null;
  home_score: number;
  away_score: number;
}

/**
 * Chi ha vinto il rally, scorrendo le azioni dall'ultima:
 *  - # su Battuta / Attacco / Muro (o alzata T/H, il "dump") → punto a chi tocca;
 *  - errore (vedi isErrorEval) → punto all'avversario;
 *  - altrimenti si guarda il punteggio dell'ultima azione.
 */
export function rallyWinnerSide(rally: RallyAction[]): 'home' | 'away' | null {
  for (let i = rally.length - 1; i >= 0; i--) {
    const a = rally[i];
    if (a.evaluation === '#') {
      if (a.skill === 'A' || a.skill === 'B' || a.skill === 'S') return a.side;
      if (a.skill === 'E' && (a.skill_type === 'T' || a.skill_type === 'H')) return a.side;
    }
    if (isErrorEval(a.skill, a.evaluation)) {
      return a.side === 'home' ? 'away' : 'home';
    }
  }
  const last = rally[rally.length - 1];
  if (!last) return null;
  if (last.home_score > last.away_score) return 'home';
  if (last.away_score > last.home_score) return 'away';
  return null;
}
