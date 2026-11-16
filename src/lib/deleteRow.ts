import { supabase } from '@/integrations/supabase/client';

/**
 * Cancella una riga e dice se è stata davvero cancellata.
 * Con le regole RLS una cancellazione non permessa non dà errore: restituisce 0 righe.
 */
export async function deleteRow(
  table: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      delete: () => { eq: (c: string, v: string) => { select: (c: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }> } };
    };
  }).from(table).delete().eq('id', id).select('id');
  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: 'Non hai il permesso di cancellare questo elemento.' };
  return { ok: true };
}
