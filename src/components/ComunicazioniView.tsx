import { useEffect, useState } from 'react';
import { Megaphone, Plus, Pin, AlertTriangle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

type Priority = 'bassa' | 'normale' | 'alta' | 'urgente';

interface Communication {
  id: string; title: string; content: string;
  priority: Priority;
  pinned: boolean; expires_at: string | null; created_at: string;
}

const PRIORITY_VARIANT: Record<Priority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  urgente: 'destructive', alta: 'default', normale: 'secondary', bassa: 'outline',
};

export function ComunicazioniView() {
  const { user } = useAuth();
  const { societyId, isAdmin } = useActiveSociety();
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; priority: Priority; pinned: boolean }>({ title: '', content: '', priority: 'normale', pinned: false });

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const { data } = await supabase.from('communications').select('*')
      .eq('society_id', societyId).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    setComms((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [societyId]);

  const create = async () => {
    if (!form.title || !form.content || !societyId || !user) return;
    const { error } = await supabase.from('communications').insert({ ...form, society_id: societyId, created_by: user.id });
    if (error) { toast.error('Errore pubblicazione'); return; }
    setDialogOpen(false);
    setForm({ title: '', content: '', priority: 'normale', pinned: false });
    toast.success('Comunicazione pubblicata');
    load();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from('communications').update({ pinned: !pinned }).eq('id', id);
    setComms(prev => prev.map(c => c.id === id ? { ...c, pinned: !pinned } : c).sort((a, b) => Number(b.pinned) - Number(a.pinned)));
  };

  const remove = async (id: string) => {
    await supabase.from('communications').delete().eq('id', id);
    setComms(prev => prev.filter(c => c.id !== id));
    toast.success('Comunicazione rimossa');
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
          <div className="flex items-center gap-3 mb-1">
            <Megaphone className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Comunicazioni</h1>
          </div>
          <p className="text-muted-foreground">Bacheca interna: avvisi e comunicazioni urgenti.</p>
        </div>
        {isAdmin && <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuova</Button>}
      </div>

      {loading ? <p className="text-muted-foreground">Caricamento...</p> :
       comms.length === 0 ? (
        <Card className="p-10 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nessuna comunicazione ancora.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {comms.map(c => (
            <Card key={c.id} className={`p-5 ${c.pinned ? 'border-primary/40' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {c.pinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    {c.priority === 'urgente' && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                    <Badge variant={PRIORITY_VARIANT[c.priority]}>{c.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('it-IT')}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{c.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant={c.pinned ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => togglePin(c.id, c.pinned)}>
                      <Pin className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova comunicazione</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titolo</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo comunicazione" /></div>
            <div><Label>Contenuto</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Scrivi qui..." rows={4} /></div>
            <div><Label>Priorità</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pinned" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
              <Label htmlFor="pinned" className="cursor-pointer">Fissa in cima</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={create}>Pubblica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
