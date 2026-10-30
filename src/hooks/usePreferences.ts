import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { defaultPrefs, sanitizePrefs, type UserPrefs } from '@/lib/homeLayout';

const localKey = (userId: string, societyId: string) => `user_prefs:${userId}:${societyId}`;

function readLocal(userId: string, societyId: string): UserPrefs | null {
  try {
    const raw = localStorage.getItem(localKey(userId, societyId));
    return raw ? sanitizePrefs(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, societyId: string, prefs: UserPrefs) {
  try {
    localStorage.setItem(localKey(userId, societyId), JSON.stringify(prefs));
  } catch {
    /* storage non disponibile: la copia su Supabase resta valida */
  }
}

// La tabella user_preferences non è ancora nei tipi generati: accesso non tipizzato e confinato qui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prefsTable = () => (supabase as any).from('user_preferences');

/**
 * Preferenze personali (blocchi, voci di menu, card Home) per utente e società.
 * Fonte: Supabase `user_preferences`, con copia in localStorage come cache e come
 * fallback se la tabella non è raggiungibile. Il livello società (feature flag) resta
 * a monte: qui si può solo nascondere altro, mai riattivare ciò che la società ha spento.
 */
export function usePreferences() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const qc = useQueryClient();
  const userId = user?.id ?? null;
  const enabled = !!userId && !!societyId;
  const queryKey = useMemo(() => ['user_preferences', userId, societyId] as const, [userId, societyId]);

  const { data, isLoading } = useQuery<UserPrefs>({
    queryKey,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const cached = readLocal(userId!, societyId!);
      const { data: row, error } = await prefsTable()
        .select('preferences')
        .eq('user_id', userId!)
        .eq('society_id', societyId!)
        .maybeSingle();
      if (error) return cached ?? defaultPrefs();
      if (!row) return cached ?? defaultPrefs();
      const prefs = sanitizePrefs(row.preferences);
      writeLocal(userId!, societyId!, prefs);
      return prefs;
    },
    initialData: () => (enabled ? readLocal(userId!, societyId!) ?? undefined : undefined),
  });

  const prefs = data ?? defaultPrefs();

  const save = useCallback(
    async (next: UserPrefs) => {
      if (!userId || !societyId) return;
      const clean = sanitizePrefs(next);
      qc.setQueryData(queryKey, clean);
      writeLocal(userId, societyId, clean);
      const { error } = await prefsTable().upsert(
        { user_id: userId, society_id: societyId, preferences: clean },
        { onConflict: 'user_id,society_id' },
      );
      if (error) throw error;
    },
    [qc, queryKey, userId, societyId],
  );

  const update = useCallback(
    (fn: (current: UserPrefs) => UserPrefs) => save(fn(structuredClone(prefs))),
    [prefs, save],
  );

  const reset = useCallback(() => save(defaultPrefs()), [save]);

  return {
    prefs,
    loading: enabled && isLoading,
    ready: enabled,
    update,
    reset,
    isBlockHidden: (id: string) => (prefs.hiddenBlocks as string[]).includes(id),
    isItemHidden: (url: string) => prefs.hiddenItems.includes(url),
  };
}
