import { useEffect, useMemo, useState } from 'react';
import { Boxes, Package, RotateCcw, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

interface Athlete {
  id: string;
  last_name: string;
  first_name: string | null;
  number: number | null;
  role: string | null;
}

interface Assignment {
  id: string;
  item_id: string;
  athlete_id: string;
  quantity: number;
  size: string | null;
  assigned_at: string;
  returned_at: string | null;
  inventory_items?: { name: string; category: string | null };
}

export default function Inventario() {
  const { societyId } = useActiveSociety();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [showReturned, setShowReturned] = useState(false);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const [{ data: ath }, { data: ass }] = await Promise.all([
      supabase.from('athletes').select('id, last_name, first_name, number, role').eq('society_id', societyId).order('last_name'),
      supabase.from('inventory_assignments')
        .select('id, item_id, athlete_id, quantity, size, assigned_at, returned_at, inventory_items(name, category)')
        .eq('society_id', societyId).order('assigned_at', { ascending: false }),
    ]);
    setAthletes((ath as any) || []);
    setAssignments((ass as any) || []);
    if (!selectedId && ath && ath.length > 0) setSelectedId((ath[0] as any).id);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [societyId]);

  const markReturned = async (id: string) => {
    const { error } = await supabase.from('inventory_assignments')
      .update({ returned_at: new Date().toISOString().slice(0, 10) }).eq('id', id);
    if (error) { toast.error('Errore aggiornamento'); return; }
    toast.success('Restituzione registrata');
    load();
  };

  const filteredAthletes = useMemo(() => {
    if (!filter.trim()) return athletes;
    const q = filter.toLowerCase();
    return athletes.filter(a =>
      a.last_name.toLowerCase().includes(q) ||
      (a.first_name ?? '').toLowerCase().includes(q) ||
      String(a.number ?? '').includes(q)
    );
  }, [athletes, filter]);

  const athleteAssignments = assignments.filter(a => a.athlete_id === selectedId);
  const active = athleteAssignments.filter(a => !a.returned_at);
  const returned = athleteAssignments.filter(a => a.returned_at);
  const totalItems = active.reduce((sum, a) => sum + (a.quantity || 1), 0);
  const selected = athletes.find(a => a.id === selectedId);

  const countsByAthlete = useMemo(() => {
    const m: Record<string, number> = {};
    assignments.forEach(a => {
      if (a.returned_at) return;
      m[a.athlete_id] = (m[a.athlete_id] || 0) + (a.quantity || 1);
    });
    return m;
  }, [assignments]);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Atleta & Inventario</p>
        <div className="flex items-center gap-3 mb-1">
          <Boxes className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Inventario Atleta</h1>
        </div>
        <p className="text-muted-foreground">Cosa è stato consegnato a ciascun atleta, taglie, restituzioni.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : athletes.length === 0 ? (
        <Card className="p-10 text-center">
          <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun atleta in rosa.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar atleti */}
          <Card className="p-3 space-y-2 h-fit">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Cerca atleta…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredAthletes.map(a => {
                const c = countsByAthlete[a.id] || 0;
                const isSel = selectedId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                      isSel ? 'bg-primary/10 border border-primary/40' : 'hover:bg-muted/40 border border-transparent'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-black text-primary">{a.number ?? '—'}</span>
                    </div>
                    <span className="flex-1 text-sm font-semibold truncate">
                      {a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''}
                    </span>
                    {c > 0 && <Badge variant="secondary" className="text-[10px]">{c}</Badge>}
                  </button>
                );
              })}
              {filteredAthletes.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Nessun risultato.</p>
              )}
            </div>
          </Card>

          {/* Dettaglio atleta */}
          {selected ? (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="font-black text-primary">#{selected.number ?? '—'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black italic uppercase truncate">
                      {selected.last_name}{selected.first_name ? ` ${selected.first_name}` : ''}
                    </h2>
                    {selected.role && <p className="text-xs text-muted-foreground">{selected.role}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">In dotazione</p>
                    <p className="text-3xl font-black text-primary leading-none">{totalItems}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Articoli</p>
                    <p className="text-xl font-black">{active.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Restituiti</p>
                    <p className="text-xl font-black text-muted-foreground">{returned.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Totale storico</p>
                    <p className="text-xl font-black">{athleteAssignments.length}</p>
                  </div>
                </div>
              </Card>

              {/* Consegne attive */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase italic flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    In dotazione ({active.length})
                  </h3>
                </div>
                {active.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun articolo consegnato.</p>
                ) : (
                  <div className="space-y-1.5">
                    {active.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30 border border-border/40">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{a.inventory_items?.name ?? '—'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.inventory_items?.category ?? 'Altro'} · consegnato {new Date(a.assigned_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        {a.size && <Badge variant="outline" className="text-xs">{a.size}</Badge>}
                        <Badge variant="secondary">×{a.quantity}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-primary"
                          onClick={() => markReturned(a.id)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Restituito
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Storico restituiti */}
              {returned.length > 0 && (
                <Card className="p-5 space-y-3">
                  <button
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowReturned(s => !s)}
                  >
                    <h3 className="text-sm font-bold uppercase italic text-muted-foreground">
                      Restituiti ({returned.length})
                    </h3>
                    <span className="text-xs text-muted-foreground">{showReturned ? 'Nascondi' : 'Mostra'}</span>
                  </button>
                  {showReturned && (
                    <div className="space-y-1.5">
                      {returned.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-md opacity-60">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate line-through">{a.inventory_items?.name ?? '—'}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Consegnato {new Date(a.assigned_at).toLocaleDateString('it-IT')} · restituito {a.returned_at ? new Date(a.returned_at).toLocaleDateString('it-IT') : '—'}
                            </p>
                          </div>
                          {a.size && <Badge variant="outline" className="text-xs">{a.size}</Badge>}
                          <Badge variant="outline">×{a.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <p className="text-muted-foreground">Seleziona un atleta per vedere il suo inventario.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
