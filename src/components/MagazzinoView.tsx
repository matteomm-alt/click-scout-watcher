import { useEffect, useState } from 'react';
import { Package, Plus, X, UserCheck } from 'lucide-react';
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

interface Item { id: string; name: string; category: string | null; quantity: number; size: string | null; notes: string | null; }
interface Assignment { id: string; item_id: string; athlete_id: string; quantity: number; assigned_at: string; returned_at: string | null; athletes?: { last_name: string; first_name: string | null; number: number | null }; }
interface Athlete { id: string; last_name: string; first_name: string | null; number: number | null; }

const CATEGORIES = ['Divise', 'Palloni', 'Attrezzatura', 'Accessori', 'Altro'];

export function MagazzinoView() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [items, setItems] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Divise', quantity: 1, size: '', notes: '' });
  const [assignAthlete, setAssignAthlete] = useState('');
  const [assignQty, setAssignQty] = useState(1);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const [{ data: it }, { data: at }] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('society_id', societyId).order('category').order('name'),
      supabase.from('athletes').select('id, last_name, first_name, number').eq('society_id', societyId).order('last_name'),
    ]);
    setItems((it as any) || []);
    setAthletes((at as any) || []);
    setLoading(false);
  };

  const loadAssignments = async (itemId: string) => {
    const { data } = await supabase.from('inventory_assignments').select('*, athletes(last_name, first_name, number)').eq('item_id', itemId).is('returned_at', null);
    setAssignments((data as any) || []);
  };

  useEffect(() => { load(); }, [societyId]);
  useEffect(() => { if (selectedItem) loadAssignments(selectedItem.id); }, [selectedItem]);

  const createItem = async () => {
    if (!form.name || !societyId || !user) return;
    const { data, error } = await supabase.from('inventory_items').insert({ ...form, size: form.size || null, notes: form.notes || null, society_id: societyId, created_by: user.id }).select().single();
    if (error) { toast.error('Errore creazione'); return; }
    setItems(prev => [...prev, data as any]);
    setDialogOpen(false);
    setForm({ name: '', category: 'Divise', quantity: 1, size: '', notes: '' });
    toast.success('Articolo aggiunto');
  };

  const deleteItem = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    toast.success('Articolo rimosso');
  };

  const assignItem = async () => {
    if (!selectedItem || !assignAthlete || !user) return;
    const { data, error } = await supabase.from('inventory_assignments').insert({ item_id: selectedItem.id, athlete_id: assignAthlete, quantity: assignQty, recorded_by: user.id, society_id: selectedItem.society_id }).select('*, athletes(last_name, first_name, number)').single();
    if (error) { toast.error('Errore assegnazione'); return; }
    setAssignments(prev => [...prev, data as any]);
    setAssignAthlete('');
    setAssignQty(1);
    toast.success('Assegnato');
  };

  const returnItem = async (assignId: string) => {
    await supabase.from('inventory_assignments').update({ returned_at: new Date().toISOString() }).eq('id', assignId);
    setAssignments(prev => prev.filter(a => a.id !== assignId));
    toast.success('Restituzione registrata');
  };

  const byCategory = CATEGORIES.map(cat => ({ cat, items: items.filter(i => i.category === cat) })).filter(g => g.items.length > 0);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Magazzino</h1>
          </div>
          <p className="text-muted-foreground">Divise, palloni e attrezzatura. Assegnazioni ad atleti.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Aggiungi</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? <p className="text-muted-foreground">Caricamento...</p> :
           items.length === 0 ? (
            <Card className="p-8 text-center"><Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nessun articolo ancora.</p></Card>
          ) : byCategory.map(({ cat, items: catItems }) => (
            <div key={cat}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{cat}</p>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <button key={item.id} onClick={() => setSelectedItem(item)}
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

        {selectedItem && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase italic">{selectedItem.name} — Assegnazioni</h3>
            <div className="flex gap-2">
              <Select value={assignAthlete} onValueChange={setAssignAthlete}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleziona atleta..." /></SelectTrigger>
                <SelectContent>
                  {athletes.map(a => <SelectItem key={a.id} value={a.id}>#{a.number} {a.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={assignQty} onChange={e => setAssignQty(+e.target.value)} className="w-16 text-center" />
              <Button size="icon" onClick={assignItem} disabled={!assignAthlete}><UserCheck className="w-4 h-4" /></Button>
            </div>
            {assignments.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna assegnazione attiva.</p> : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="font-semibold">#{a.athletes?.number} {a.athletes?.last_name}</span>
                    <Badge variant="secondary">×{a.quantity}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(a.assigned_at).toLocaleDateString('it-IT')}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => returnItem(a.id)}>Restituito</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

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
    </div>
  );
}
