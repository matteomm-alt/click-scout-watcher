import { useEffect, useState } from 'react';
import { Package, Plus, X, UserCheck, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

// ── Costanti dalla nostra app HTML ────────────────────────────────────
const TAGLIE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unica'];

const ARTICOLI_DEFAULT = [
  { name: 'Maglia Gara',         category: 'Divise',       hasTaglia: true  },
  { name: 'Pantaloncini Gara',   category: 'Divise',       hasTaglia: true  },
  { name: 'Ginocchiere',         category: 'Attrezzatura', hasTaglia: true  },
  { name: 'Giaccone',            category: 'Divise',       hasTaglia: true  },
  { name: 'Borsa',               category: 'Accessori',    hasTaglia: false },
  { name: 'Maglia Allenamento',  category: 'Divise',       hasTaglia: true  },
  { name: 'Felpa Allenamento',   category: 'Divise',       hasTaglia: true  },
  { name: 'Calzini',             category: 'Attrezzatura', hasTaglia: true  },
];

const CATEGORIES = ['Divise', 'Palloni', 'Attrezzatura', 'Accessori', 'Altro'];

// ── Tipi ─────────────────────────────────────────────────────────────
interface Item {
  id: string; name: string; category: string | null;
  quantity: number; size: string | null; notes: string | null;
}
interface Assignment {
  id: string; item_id: string; athlete_id: string;
  quantity: number; size: string | null;
  assigned_at: string; returned_at: string | null;
  athletes?: { last_name: string; first_name: string | null; number: number | null };
  inventory_items?: { name: string };
}
interface Athlete {
  id: string; last_name: string; first_name: string | null; number: number | null;
}

export function MagazzinoView() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [tab, setTab] = useState<'inventario' | 'consegne' | 'atleta'>('inventario');
  const [items, setItems] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Divise', quantity: 1, size: '', notes: '' });
  const [assignForm, setAssignForm] = useState({ athlete_id: '', item_id: '', size: '', quantity: 1 });

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const [{ data: it }, { data: at }, { data: as_ }] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('society_id', societyId).order('category').order('name'),
      supabase.from('athletes').select('id, last_name, first_name, number').eq('society_id', societyId).order('last_name'),
      supabase.from('inventory_assignments').select('*, athletes(last_name, first_name, number), inventory_items(name)')
        .eq('society_id', societyId).is('returned_at', null).order('assigned_at', { ascending: false }),
    ]);
    setItems((it as any) || []);
    setAthletes((at as any) || []);
    setAssignments((as_ as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [societyId]);

  // Crea articoli default se magazzino vuoto
  const initDefault = async () => {
    if (!societyId || !user) return;
    const inserts = ARTICOLI_DEFAULT.map(a => ({ name: a.name, category: a.category, quantity: 1, size: null, notes: null, society_id: societyId, created_by: user.id }));
    const { error } = await supabase.from('inventory_items').insert(inserts);
    if (error) { toast.error('Errore init'); return; }
    toast.success('Articoli default aggiunti');
    load();
  };

  const createItem = async () => {
    if (!form.name || !societyId || !user) return;
    const { error } = await supabase.from('inventory_items').insert({
      name: form.name, category: form.category, quantity: form.quantity,
      size: form.size || null, notes: form.notes || null,
      society_id: societyId, created_by: user.id,
    });
    if (error) { toast.error('Errore creazione'); return; }
    setDialogOpen(false);
    setForm({ name: '', category: 'Divise', quantity: 1, size: '', notes: '' });
    toast.success('Articolo aggiunto');
    load();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    if (selectedItem?.id === id) setSelectedItem(null);
    toast.success('Articolo rimosso');
    load();
  };

  const assignItem = async () => {
    if (!assignForm.athlete_id || !assignForm.item_id || !user || !societyId) return;
    const { error } = await supabase.from('inventory_assignments').insert({
      item_id: assignForm.item_id, athlete_id: assignForm.athlete_id,
      quantity: assignForm.quantity, size: assignForm.size || null,
      society_id: societyId, recorded_by: user.id,
    });
    if (error) { toast.error('Errore assegnazione'); return; }
    setAssignDialogOpen(false);
    setAssignForm({ athlete_id: '', item_id: '', size: '', quantity: 1 });
    toast.success('Consegna registrata');
    load();
  };

  const returnItem = async (id: string) => {
    await supabase.from('inventory_assignments').update({ returned_at: new Date().toISOString() }).eq('id', id);
    toast.success('Restituzione registrata');
    load();
  };

  const byCategory = CATEGORIES.map(cat => ({ cat, items: items.filter(i => i.category === cat) })).filter(g => g.items.length > 0);

  // Per atleta: raggruppa assignments per athlete_id
  const athleteAssignments = athletes.map(a => ({
    athlete: a,
    items: assignments.filter(ass => ass.athlete_id === a.id),
  })).filter(x => x.items.length > 0);

  // Item selezionato: taglia disponibile
  const selectedItemObj = items.find(i => i.id === assignForm.item_id);
  const hasTaglia = ARTICOLI_DEFAULT.find(d => d.name === selectedItemObj?.name)?.hasTaglia ?? true;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Magazzino</h1>
          </div>
          <p className="text-muted-foreground">Divise, palloni e attrezzatura. Assegnazioni e taglie.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)} className="gap-2">
            <UserCheck className="w-4 h-4" /> Consegna
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Aggiungi
          </Button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1">
        {([['inventario', 'Inventario'], ['consegne', 'Consegne'], ['atleta', 'Per Atleta']] as const).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Caricamento...</p> : (
        <>
          {/* TAB INVENTARIO */}
          {tab === 'inventario' && (
            <div className="space-y-4">
              {items.length === 0 ? (
                <Card className="p-8 text-center space-y-3">
                  <Package className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Nessun articolo. Aggiungi manualmente o carica i default.</p>
                  <Button variant="outline" onClick={initDefault} className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Carica articoli default
                  </Button>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {byCategory.map(({ cat, items: catItems }) => (
                      <div key={cat}>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{cat}</p>
                        <div className="space-y-1.5">
                          {catItems.map(item => (
                            <button key={item.id} onClick={() => setSelectedItem(item === selectedItem ? null : item)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${selectedItem?.id === item.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{item.name}</p>
                                {item.size && <p className="text-xs text-muted-foreground">Taglia: {item.size}</p>}
                              </div>
                              <Badge variant="outline">×{item.quantity}</Badge>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pannello assegnazioni articolo selezionato */}
                  {selectedItem && (
                    <Card className="p-5 space-y-3">
                      <h3 className="text-sm font-bold uppercase italic">{selectedItem.name} — Consegnato a</h3>
                      {assignments.filter(a => a.item_id === selectedItem.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna consegna attiva.</p>
                      ) : (
                        <div className="space-y-2">
                          {assignments.filter(a => a.item_id === selectedItem.id).map(a => (
                            <div key={a.id} className="flex items-center gap-3 text-sm">
                              <span className="font-semibold">#{a.athletes?.number} {a.athletes?.last_name}</span>
                              {a.size && <Badge variant="outline" className="text-xs">{a.size}</Badge>}
                              <Badge variant="secondary">×{a.quantity}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{new Date(a.assigned_at).toLocaleDateString('it-IT')}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => returnItem(a.id)}>
                                Restituito
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB CONSEGNE */}
          {tab === 'consegne' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">Nessuna consegna attiva.</p>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/30">
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="text-left p-4">Atleta</th>
                        <th className="text-left p-4">Articolo</th>
                        <th className="text-center p-4">Taglia</th>
                        <th className="text-center p-4">Qt.</th>
                        <th className="text-center p-4">Data</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(a => (
                        <tr key={a.id} className="border-b border-border/40">
                          <td className="p-4 font-semibold">#{a.athletes?.number} {a.athletes?.last_name}</td>
                          <td className="p-4">{a.inventory_items?.name || '—'}</td>
                          <td className="p-4 text-center">{a.size ? <Badge variant="outline">{a.size}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-4 text-center">{a.quantity}</td>
                          <td className="p-4 text-center text-xs text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString('it-IT')}</td>
                          <td className="p-4">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => returnItem(a.id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Restituito
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* TAB PER ATLETA */}
          {tab === 'atleta' && (
            <div className="space-y-3">
              {athleteAssignments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">Nessuna consegna attiva.</p>
                </Card>
              ) : (
                athleteAssignments.map(({ athlete, items: aItems }) => (
                  <Card key={athlete.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-primary">#{athlete.number}</span>
                      </div>
                      <span className="font-bold">{athlete.last_name}{athlete.first_name ? ` ${athlete.first_name}` : ''}</span>
                      <Badge variant="secondary" className="ml-auto">{aItems.length} articoli</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aItems.map(a => (
                        <div key={a.id} className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-full px-3 py-1">
                          <span className="font-semibold">{a.inventory_items?.name}</span>
                          {a.size && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.size}</Badge>}
                          <span className="text-muted-foreground">×{a.quantity}</span>
                          <button onClick={() => returnItem(a.id)} className="text-primary hover:text-primary/70 ml-1 transition-colors">×</button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Dialog nuovo articolo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo articolo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Maglia gara blu" /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantità</Label><Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
              <div><Label>Taglia</Label><Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="S, M, L, XL..." /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={createItem}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog consegna */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registra consegna</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Atleta</Label>
              <Select value={assignForm.athlete_id} onValueChange={v => setAssignForm(f => ({ ...f, athlete_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona atleta..." /></SelectTrigger>
                <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>#{a.number} {a.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Articolo</Label>
              <Select value={assignForm.item_id} onValueChange={v => setAssignForm(f => ({ ...f, item_id: v, size: '' }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {assignForm.item_id && hasTaglia && (
              <div><Label>Taglia</Label>
                <Select value={assignForm.size} onValueChange={v => setAssignForm(f => ({ ...f, size: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleziona taglia..." /></SelectTrigger>
                  <SelectContent>{TAGLIE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Quantità</Label>
              <Input type="number" min={1} value={assignForm.quantity} onChange={e => setAssignForm(f => ({ ...f, quantity: +e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Annulla</Button>
            <Button onClick={assignItem} disabled={!assignForm.athlete_id || !assignForm.item_id}>Registra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
