import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListChecks, Plus, Trash2, UserPlus, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
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

interface Convocation { id: string; title: string; match_date: string | null; meeting_time: string | null; location: string | null; notes: string | null; created_at: string; }
interface ConvocationPlayer { id: string; convocation_id: string; athlete_id: string; role_in_match: string | null; }
interface Athlete { id: string; last_name: string; first_name: string | null; number: number | null; role: string | null; }

const ROLES = ['Titolare', 'Riserva', 'Libero', 'Fuori lista'];
const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Titolare: 'default', Riserva: 'secondary', Libero: 'outline', 'Fuori lista': 'destructive',
};

export function ConvocazioniView() {
  const { user } = useAuth();
  const { societyId, societyName } = useActiveSociety();
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [players, setPlayers] = useState<ConvocationPlayer[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', match_date: '', meeting_time: '', location: '' });

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from('convocations').select('*').eq('society_id', societyId).order('created_at', { ascending: false }),
        supabase.from('athletes').select('id, last_name, first_name, number, role').eq('society_id', societyId).order('number'),
      ]);
      setConvocations((c as any) || []);
      setAthletes((a as any) || []);
      if (c && c.length > 0) setSelectedId((c[0] as any).id);
    })();
  }, [societyId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('convocation_players').select('*').eq('convocation_id', selectedId);
      setPlayers((data as any) || []);
      setLoading(false);
    })();
  }, [selectedId]);

  const createConvocation = async () => {
    if (!form.title || !societyId || !user) return;
    const { data, error } = await supabase.from('convocations').insert({
      title: form.title, match_date: form.match_date || null, meeting_time: form.meeting_time || null,
      location: form.location || null, society_id: societyId, created_by: user.id,
    }).select().single();
    if (error) { toast.error('Errore creazione'); return; }
    setConvocations(prev => [data as any, ...prev]);
    setSelectedId((data as any).id);
    setDialogOpen(false);
    setForm({ title: '', match_date: '', meeting_time: '', location: '' });
    toast.success('Convocazione creata');
  };

  const togglePlayer = async (athleteId: string) => {
    if (!selectedId) return;
    const existing = players.find(p => p.athlete_id === athleteId);
    if (existing) {
      await supabase.from('convocation_players').delete().eq('id', existing.id);
      setPlayers(prev => prev.filter(p => p.id !== existing.id));
    } else {
      const { data } = await supabase.from('convocation_players').insert({ convocation_id: selectedId, athlete_id: athleteId, role: 'titolare' }).select().single();
      if (data) setPlayers(prev => [...prev, { ...(data as any), role_in_match: (data as any).role }]);
    }
  };

  const updateRole = async (playerId: string, role: string) => {
    const dbRole = role.toLowerCase() as 'titolare' | 'riserva' | 'libero' | 'non_convocato';
    await supabase.from('convocation_players').update({ role: dbRole }).eq('id', playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, role_in_match: role } : p));
  };

  const selected = convocations.find(c => c.id === selectedId);
  const convocati = players.map(p => ({ player: p, athlete: athletes.find(a => a.id === p.athlete_id)! })).filter(x => x.athlete);
  const nonConvocati = athletes.filter(a => !players.find(p => p.athlete_id === a.id));


  const generatePdf = () => {
    if (!selected) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 14;

    // Header
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(societyName || 'Società', 12, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Distinta ufficiale`, W - 12, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text(selected.title, 12, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const meta = [
      selected.match_date ? `Data: ${new Date(selected.match_date).toLocaleDateString('it-IT')}` : null,
      selected.meeting_time ? `Ritrovo: ${selected.meeting_time}` : null,
      selected.location ? `Luogo: ${selected.location}` : null,
    ].filter(Boolean).join('   •   ');
    if (meta) { doc.text(meta, 12, y); y += 6; }
    doc.setDrawColor(180); doc.line(12, y, W - 12, y); y += 6;

    // Tabella convocati
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const cols = [
      { x: 14, w: 14, t: 'N°' },
      { x: 28, w: 90, t: 'Cognome Nome' },
      { x: 118, w: 30, t: 'Ruolo' },
      { x: 150, w: 50, t: 'Firma' },
    ];
    cols.forEach(c => doc.text(c.t, c.x, y));
    y += 1.5; doc.line(12, y, W - 12, y); y += 5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const sorted = [...convocati].sort((a, b) => (a.athlete.number ?? 999) - (b.athlete.number ?? 999));
    sorted.forEach(({ player, athlete }) => {
      if (y > 270) { doc.addPage(); y = 14; }
      doc.text(athlete.number != null ? String(athlete.number) : '—', cols[0].x, y);
      const nome = `${athlete.last_name}${athlete.first_name ? ' ' + athlete.first_name : ''}`;
      doc.text(nome, cols[1].x, y);
      doc.text((player.role_in_match || 'titolare').toString(), cols[2].x, y);
      // riga firma
      doc.setDrawColor(200);
      doc.line(cols[3].x, y + 1, cols[3].x + cols[3].w, y + 1);
      y += 8;
    });

    // Note
    if (selected.notes) {
      if (y > 250) { doc.addPage(); y = 14; }
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text('Note coach:', 12, y); y += 5;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
      const split = doc.splitTextToSize(selected.notes, W - 24);
      doc.text(split, 12, y);
    }

    // Footer
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Distinta ufficiale — ${new Date().toLocaleDateString('it-IT')}`, 12, doc.internal.pageSize.getHeight() - 8);

    const safe = selected.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const dt = selected.match_date || new Date().toISOString().split('T')[0];
    doc.save(`convocazione_${dt}_${safe}.pdf`);
  };


  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
          <div className="flex items-center gap-3 mb-1">
            <ListChecks className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Convocazioni</h1>
          </div>
          <p className="text-muted-foreground">Crea distinte gara con titolari, riserve e libero.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuova</Button>
      </div>

      {convocations.length > 0 && (
        <div className="max-w-lg">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Seleziona convocazione..." /></SelectTrigger>
            <SelectContent>
              {convocations.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}{c.match_date ? ` — ${new Date(c.match_date).toLocaleDateString('it-IT')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selected && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase italic">Convocati</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{players.length} atleti</Badge>
                {convocati.length > 0 && (
                  <Button onClick={generatePdf}
                    className="min-h-9 px-3 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg gap-1.5">
                    <FileDown className="w-3.5 h-3.5" /> Distinta PDF
                  </Button>
                )}
              </div>
            </div>
            {loading ? <p className="text-sm text-muted-foreground">Caricamento...</p> :
             convocati.length === 0 ? <p className="text-sm text-muted-foreground">Nessun convocato ancora.</p> : (
              <div className="space-y-2">
                {convocati.map(({ player, athlete }) => (
                  <div key={athlete.id} className="flex items-center gap-2">
                    <span className="text-sm font-bold w-8">#{athlete.number}</span>
                    <span className="flex-1 text-sm truncate">{athlete.last_name}{athlete.first_name ? ` ${athlete.first_name.charAt(0)}.` : ''}</span>
                    <Select value={player.role_in_match || 'Titolare'} onValueChange={v => updateRole(player.id, v)}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => togglePlayer(athlete.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase italic">Aggiungi atleti</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {nonConvocati.length === 0 ? <p className="text-sm text-muted-foreground">Tutti convocati.</p> :
               nonConvocati.map(a => (
                <Button key={a.id} variant="ghost" className="w-full justify-start gap-2 h-9" onClick={() => togglePlayer(a.id)}>
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold w-6">#{a.number}</span>
                  <span className="flex-1 text-left truncate">{a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''}</span>
                  <span className="text-xs text-muted-foreground">{a.role}</span>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova convocazione</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titolo</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="es. vs Squadra Avversaria" /></div>
            <div><Label>Data gara</Label><Input type="date" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} /></div>
            <div><Label>Orario ritrovo</Label><Input type="time" value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} /></div>
            <div><Label>Luogo</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Palazzetto..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={createConvocation}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
