import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';

const PG_MESSAGES: Record<string, string> = {
  '23505': 'Elemento già esistente — controlla i dati inseriti.',
  '23503': 'Riferimento non valido — elemento collegato mancante.',
  '23502': 'Campo obbligatorio mancante.',
  '42501': 'Permesso negato — controlla i tuoi permessi.',
  '42P01': 'Tabella non trovata — contatta il supporto.',
  'PGRST116': 'Nessun risultato trovato.',
  'PGRST204': 'Campo non trovato nel database.',
};

const CONTEXT_MESSAGES: Record<string, string> = {
  'caricamento atleti': 'Impossibile caricare le atlete.',
  'salvataggio atleta': 'Impossibile salvare le modifiche.',
  'eliminazione atleta': "Impossibile eliminare l'atleta.",
  'caricamento allenamenti': 'Impossibile caricare gli allenamenti.',
  'salvataggio allenamento': "Impossibile salvare l'allenamento.",
  'eliminazione allenamento': "Impossibile eliminare l'allenamento.",
  'caricamento esercizi': 'Impossibile caricare gli esercizi.',
  'caricamento squadre': 'Impossibile caricare le squadre.',
  'caricamento blocchi': 'Impossibile caricare i blocchi.',
  'caricamento presenze': 'Impossibile caricare le presenze.',
  'salvataggio presenze': 'Impossibile salvare le presenze.',
  'invio comunicazione': 'Impossibile inviare la comunicazione.',
  'caricamento match': 'Impossibile caricare la partita.',
  'export PDF': 'Impossibile generare il PDF.',
};

/**
 * Gestione centralizzata degli errori Supabase.
 */
export function handleSupabaseError(
  error: PostgrestError | Error | unknown,
  context?: string,
  silent = false,
): void {
  if (!error) return;
  if (import.meta.env.DEV) {
    console.error(`[Supabase${context ? ` · ${context}` : ''}]`, error);
  }
  if (silent) return;

  let message: string;
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError;
    message =
      PG_MESSAGES[pgError.code] ??
      (context ? CONTEXT_MESSAGES[context] : null) ??
      'Si è verificato un errore. Riprova.';
  } else if (error instanceof Error) {
    message = context
      ? CONTEXT_MESSAGES[context] ?? `Errore: ${error.message}`
      : error.message;
  } else {
    message = context
      ? CONTEXT_MESSAGES[context] ?? 'Si è verificato un errore.'
      : 'Si è verificato un errore.';
  }
  toast.error(message);
}

export async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  context?: string,
  fallback?: T,
): Promise<T | typeof fallback> {
  const { data, error } = await query;
  if (error) {
    handleSupabaseError(error, context);
    return fallback;
  }
  return (data ?? fallback) as T | typeof fallback;
}
