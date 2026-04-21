import { useEffect, useState } from 'react';
import { GitBranch, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Scheme {
  id: string;
  name: string;
  description: string | null;
  fundamental: string | null;
  scheme_data: { notes?: string; image_url?: string } & Record<string, unknown>;
}

const FUNDAMENTALS = ['Ricezione', 'Attacco', 'Difesa', 'Battuta', 'Muro', 'Copertura', 'Cambio palla', 'Break point'];

const emptyForm = { name: '', description: '', fundamental: '', notes: '', image_url: '' };

export default function Schemi() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Scheme | null>(null);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('training_schemes')
      .select('*')
      .eq('society_id', societyId)
      .order('created_at', { ascending: false });
    setSchemes((data as Scheme[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [societyId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Scheme) => {
    setEditing(s);
    setForm({
      name: s.name, description: s.description ?? '', fundamental: s.fundamental ?? '',
      notes: s.scheme_data?.notes ?? '', image_url: s.scheme_data?.image_url ?? '',
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!form.name || !societyId || !user) return;
    const payload = {
      name: form.name,
      description: form.description || null,
      fundamental: form.fundamental || null,
      scheme_data: { notes: form.notes || '', image_url: form.image_url || '' },
    };
    if (editing) {
      const { error } = await supabase.from('training_schemes').update(payload).eq('id', editing.id);
      if (error) { toast.error('Errore aggiornamento'); return; }
      toast.success('Schema aggiornato');
    } else {
      const { error } = await supabase.from('training_schemes')
        .insert({ ...payload, society_id: societyId, created_by: user.id });
      if (error) { toast.error('Errore creazione'); return; }
      toast.success('Schema creato');
    }
    setDialogOpen(false);
    load();
  };
  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('training_schemes').delete().eq('id', deleteId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Eliminato');
    setDeleteId(null);
    load();
  };

  const filtered = filter === 'all' ? schemes : schemes.filter(s => s.fundamental === filter);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <div className="flex items-center gap-3 mb-1">
            <GitBranch className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Schemi tattici</h1>
          </div>
          <p className="text-muted-foreground">Schemi di ricezione, attacco, difesa, copertura e battuta.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nuovo schema</Button>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Filtro fondamentale</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {FUNDAMENTALS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} schemi</span>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessuno schema. Crea il primo per iniziare.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <Card key={s.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold uppercase italic truncate">{s.name}</h3>
                  {s.fundamental && <Badge variant="outline" className="text-[10px] mt-1">{s.fundamental}</Badge>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {s.scheme_data?.image_url && (
                <button type="button" onClick={() => setViewing(s)} className="block w-full">
                  <img src={s.scheme_data.image_url} alt={s.name}
                    className="w-full h-32 object-cover rounded border border-border hover:opacity-90 transition" />
                </button>
              )}
              {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
              {s.scheme_data?.notes && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-3 italic border-l-2 border-primary/40 pl-2">
                  {s.scheme_data.notes}
                </p>
              )}
              <Button size="sm" variant="ghost" className="mt-auto self-start text-primary text-xs"
                onClick={() => setViewing(s)}>
                Apri →
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG CREATE/EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifica schema' : 'Nuovo schema tattico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. R1 vs battuta float" /></div>
              <div><Label>Fondamentale</Label>
                <Select value={form.fundamental} onValueChange={v => setForm(f => ({ ...f, fundamental: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                  <SelectContent>{FUNDAMENTALS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrizione</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Sintesi tattica…" /></div>
            <div><Label>Note tattiche (testo libero)</Label>
              <Textarea rows={6} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Posizioni, traiettorie, varianti, chiamate…" />
            </div>
            <div><Label>URL immagine schema (opzionale)</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://…" />
              <p className="text-[10px] text-muted-foreground mt-1">Incolla un link a un'immagine già hostata.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={save}>{editing ? 'Salva' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewing.name}
                  {viewing.fundamental && <Badge variant="outline" className="text-[10px]">{viewing.fundamental}</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {viewing.scheme_data?.image_url && (
                  <img src={viewing.scheme_data.image_url} alt={viewing.name}
                    className="w-full max-h-[400px] object-contain rounded border border-border bg-muted/30" />
                )}
                {viewing.description && <p className="text-sm">{viewing.description}</p>}
                {viewing.scheme_data?.notes && (
                  <div className="bg-muted/40 rounded p-3 border-l-2 border-primary">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Note</p>
                    <p className="text-sm whitespace-pre-wrap">{viewing.scheme_data.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare schema?</AlertDialogTitle>
            <AlertDialogDescription>Operazione irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
