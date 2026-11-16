import { describe, it, expect } from 'vitest';
import { fetchAll } from '@/lib/fetchAll';

const makePager = (total: number, failAt?: number) => {
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    if (failAt !== undefined && from >= failAt) return { data: null, error: { message: 'boom' } };
    const n = Math.max(0, Math.min(to + 1, total) - from);
    return { data: Array.from({ length: n }, (_, i) => from + i), error: null };
  };
  return { page, calls };
};

describe('fetchAll', () => {
  it('legge oltre 1000 righe a pagine (2500 → 3 richieste)', async () => {
    const { page, calls } = makePager(2500);
    const r = await fetchAll<number>(page);
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('con esattamente 1000 righe chiede una pagina in più e si ferma', async () => {
    const { page, calls } = makePager(1000);
    const r = await fetchAll<number>(page);
    expect(r.data).toHaveLength(1000);
    expect(calls).toHaveLength(2);
  });

  it('restituisce l\'errore invece di dati parziali silenziosi', async () => {
    const { page } = makePager(2500, 1000);
    const r = await fetchAll<number>(page);
    expect(r.error?.message).toBe('boom');
    expect(r.data).toHaveLength(1000);
  });
});
