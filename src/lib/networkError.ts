/** Riconosce gli errori di rete dei browser ("Failed to fetch" e simili). */
export function isNetworkError(raw: unknown): boolean {
  const msg = (raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : (raw as { message?: string })?.message ?? '')
    .toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  );
}

export const NETWORK_ERROR_MESSAGE =
  'Impossibile contattare il server. Controlla la connessione e riprova. Se succede di nuovo, il servizio potrebbe essere in pausa: avvisa l’amministratore.';
