import { describe, it, expect, vi, beforeEach } from 'vitest';

const result = { data: null as unknown[] | null, error: null as { message: string } | null };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ delete: () => ({ eq: () => ({ select: () => Promise.resolve(result) }) }) }),
  },
}));

import { deleteRow } from '@/lib/deleteRow';

describe('deleteRow', () => {
  beforeEach(() => { result.data = null; result.error = null; });

  it('ok quando la riga è stata cancellata', async () => {
    result.data = [{ id: 'x' }];
    expect(await deleteRow('communications', 'x')).toEqual({ ok: true });
  });

  it('non ok quando RLS rifiuta in silenzio (0 righe)', async () => {
    result.data = [];
    const r = await deleteRow('communications', 'x');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/permesso/);
  });

  it('non ok con errore del database', async () => {
    result.error = { message: 'boom' };
    expect(await deleteRow('communications', 'x')).toEqual({ ok: false, message: 'boom' });
  });
});
