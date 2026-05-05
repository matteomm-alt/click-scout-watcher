import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, X, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';

// ── Costanti ──────────────────────────────────────────────────────────
const TIPI_STRUTTURA = [
  { id: 1, label: 'Monosettimanale', desc: '1 settimana tipo' },
  { id: 2, label: 'Bisettimanale',   desc: '2 settimane tipo (A/B)' },
  { id: 3, label: 'Trisettimanale',  desc: '3 settimane tipo' },
  { id: 4, label: 'Mensile',         desc: '4 settimane tipo' },
];

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const FONDAMENTALI = [
  'Ricezione', 'Attacco', 'Battuta', 'Muro', 'Difesa', 'Alzata',
  'Bagher', 'Palleggio', 'Fisico', 'Tattica', 'Gioco libero',
];

const FORME = [
  '6vs6', '3vs3', 'Esercizio analitico', 'Situazione', 'Partita',
  'Circuito', 'Individuale', 'Per reparto',
];

// ── Tipi ─────────────────────────────────────────────────────────────
interface Blocco { nome: string; fondamentali: string[]; forma: string; minuti: number | ''; }
interface Seduta { giorno: number | null; blocchi: Blocco[]; }
interface Settimana { sedute: Seduta[]; }
interface StrutturaBlocks {
  nSettimane: number;
  nSedute: number;
  settimane: Settimana[];
}

interface Struttura {
  id: string;
  name: string;
  description: string | null;
  total_duration_min: number | null;
  blocks: StrutturaBlocks;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────
function creaSettimane(nSett: number, nSed: number, existing?: Settimana[]): Settimana[] {
  return Array.from({ length: nSett }, (_, wi) => ({
    sedute: Array.from({ length: nSed }, (_, si) => ({
      giorno: existing?.[wi]?.sedute?.[si]?.giorno ?? null,
      blocchi: existing?.[wi]?.sedute?.[si]?.blocchi ?? [],
    })),
  }));
}

function totalMinuti(blocks: StrutturaBlocks): number {
  return blocks.settimane[0]?.sedute.reduce((tot, s) =>
    tot + s.blocchi.reduce((t, b) => t + (Number(b.minuti) || 0), 0), 0) || 0;
}

// ── Componente principale ─────────────────────────────────────────────
export function StrutturaSettimanaleView() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const navigate = useNavigate();
  const [strutture, setStrutture] = useState<Struttura[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Struttura | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [nSettimane, setNSettimane] = useState(1);
  const [nSedute, setNSedute] = useState(3);
  const [settimane, setSettimane] = useState<Settimana[]>(creaSettimane(1, 3));

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const { data } = await supabase.from('training_skeletons')
      .select('*').eq('society_id', societyId)
      .order('created_at', { ascending: false });
    const list = ((data as any) || []).map((d: any) => ({
      ...d,
      blocks: typeof d.blocks === 'string' ? JSON.parse(d.blocks) : d.blocks,
    }));
    setStrutture(list);
    const counts: Record<string, number> = {};
    await Promise.all(list.map(async (s: Struttura) => {
      const { count } = await supabase
        .from('trainings')
        .select('id', { count: 'exact', head: true })
        .eq('skeleton_id', s.id);
      counts[s.id] = count ?? 0;
    }));
    setUsageCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, [societyId]);

  // Quando cambio nSettimane o nSedute, ricalcolo preservando i dati esistenti
  const changeNSettimane = (n: number) => {
    setNSettimane(n);
    setSettimane(creaSettimane(n, nSedute, settimane));
  };
  const changeNSedute = (n: number) => {
    setNSedute(n);
    setSettimane(creaSettimane(nSettimane, n, settimane));
  };

  const openCreate = () => {
    setEditing(null);
    setNome(''); setDesc('');
    setNSettimane(1); setNSedute(3);
    setSettimane(creaSettimane(1, 3));
    setDialogOpen(true);
  };

  const openEdit = (s: Struttura) => {
    setEditing(s);
    setNome(s.name);
    setDesc(s.description || '');
    setNSettimane(s.blocks.nSettimane || 1);
    setNSedute(s.blocks.nSedute || 3);
    setSettimane(s.blocks.settimane || creaSettimane(s.blocks.nSettimane || 1, s.blocks.nSedute || 3));
    setDialogOpen(true);
  };

  const duplicate = async (s: Struttura) => {
    if (!societyId || !user) return;
    const { error } = await supabase.from('training_skeletons').insert({
      name: `${s.name} (copia)`,
      description: s.description,
      society_id: societyId,
      created_by: user.id,
      blocks: s.blocks as any,
    });
    if (error) { toast.error('Errore duplicazione'); return; }
    toast.success('Struttura duplicata');
    load();
  };

  const save = async () => {
    if (!nome || !societyId || !user) return;
    const blocks: StrutturaBlocks = { nSettimane, nSedute, settimane };
    const payload = {
      name: nome,
      description: desc || null,
      society_id: societyId,
      created_by: user.id,
      blocks: blocks as any,
      total_duration_min: totalMinuti(blocks) || null,
    };
    const { error } = editing
      ? await supabase.from('training_skeletons').update(payload).eq('id', editing.id)
      : await supabase.from('training_skeletons').insert(payload);
    if (error) { toast.error('Errore salvataggio'); return; }
    toast.success(editing ? 'Struttura aggiornata' : 'Struttura salvata');
    setDialogOpen(false);
    load();
  };

  const deleteSt = async () => {
    if (!deleteId) return;
    await supabase.from('training_skeletons').delete().eq('id', deleteId);
    toast.success('Struttura rimossa');
    setDeleteId(null);
    load();
  };

  // Helpers per modificare settimane/sedute/blocchi nel form
  const updateGiorno = (wi: number, si: number, g: number) => {
    setSettimane(prev => prev.map((sett, w) => w !== wi ? sett : {
      ...sett,
      sedute: sett.sedute.map((sed, s) => s !== si ? sed : { ...sed, giorno: g }),
    }));
  };
  const addBlocco = (wi: number, si: number) => {
    setSettimane(prev => prev.map((sett, w) => w !== wi ? sett : {
      ...sett,
      sedute: sett.sedute.map((sed, s) => s !== si ? sed : {
        ...sed, blocchi: [...sed.blocchi, { nome: '', fondamentali: [], forma: '', minuti: '' }],
      }),
    }));
  };
  const updateBlocco = (wi: number, si: number, bi: number, field: keyof Blocco, val: string) => {
    setSettimane(prev => prev.map((sett, w) => w !== wi ? sett : {
      ...sett,
      sedute: sett.sedute.map((sed, s) => s !== si ? sed : {
        ...sed,
        blocchi: sed.blocchi.map((b, i) => i !== bi ? b : { ...b, [field]: field === 'minuti' ? (val === '' ? '' : parseInt(val)) : val }),
      }),
    }));
  };

  const toggleFondamentale = (wi: number, si: number, bi: number, f: string) => {
    setSettimane(prev => prev.map((sett, w) => w !== wi ? sett : {
      ...sett,
      sedute: sett.sedute.map((sed, s) => s !== si ? sed : {
        ...sed,
        blocchi: sed.blocchi.map((b, i) => {
          if (i !== bi) return b;
          const has = b.fondamentali.includes(f);
          return { ...b, fondamentali: has ? b.fondamentali.filter(x => x !== f) : [...b.fondamentali, f] };
        }),
      }),
    }));
  };
  const removeBlocco = (wi: number, si: number, bi: number) => {
    setSettimane(prev => prev.map((sett, w) => w !== wi ? sett : {
      ...sett,
      sedute: sett.sedute.map((sed, s) => s !== si ? sed : {
        ...sed, blocchi: sed.blocchi.filter((_, i) => i !== bi),
      }),
    }));
  };

  const tipoLabel = (n: number) => TIPI_STRUTTURA.find(t => t.id === n)?.label || `${n} settimane`;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <div className="flex items-center gap-3 mb-1">
            <LayoutTemplate className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-black italic uppercase leading-none">Struttura Settimanale</h1>
          </div>
          <p className="text-muted-foreground">Template riutilizzabili: mono/bi/tri/mensile con sedute e blocchi per fondamentale.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nuova</Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Gli scheletri sono modelli di allenamento riutilizzabili. Creane uno e applicalo a più sedute senza dover ricominciare da zero.
        </p>
      </div>

      {loading ? <p className="text-muted-foreground">Caricamento...</p> :
       strutture.length === 0 ? (
        <Card className="p-10 text-center">
          <LayoutTemplate className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nessuna struttura ancora. Clicca Nuova per iniziare.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {strutture.map(s => {
            const isOpen = expanded === s.id;
            const blocks = s.blocks || { nSettimane: 1, nSedute: 3, settimane: [] };
            return (
              <Card key={s.id} className="overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <button className="flex-1 flex items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : s.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{s.name}</span>
                        <Badge variant="outline">{tipoLabel(blocks.nSettimane)}</Badge>
                        <Badge variant="secondary">{blocks.nSedute} sed/sett</Badge>
                        {s.total_duration_min && <Badge variant="secondary">{s.total_duration_min} min/sed</Badge>}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicate(s)}><Copy className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                {/* Dettaglio espanso */}
                {isOpen && (
                  <div className="border-t border-border p-4 space-y-4">
                    {(blocks.settimane || []).map((sett, wi) => (
                      <div key={wi}>
                        {blocks.nSettimane > 1 && (
                          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">
                            Settimana {wi + 1} {blocks.nSettimane === 2 ? (wi === 0 ? '(A)' : '(B)') : ''}
                          </p>
                        )}
                        <div className="grid md:grid-cols-3 gap-3">
                          {sett.sedute.map((sed, si) => {
                            const totMin = sed.blocchi.reduce((t, b) => t + (Number(b.minuti) || 0), 0);
                            return (
                              <div key={si} className="border border-border rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-primary uppercase">
                                    {sed.giorno !== null ? GIORNI[sed.giorno] : `Seduta ${si + 1}`}
                                  </span>
                                  {totMin > 0 && <span className="text-[10px] text-muted-foreground">{totMin} min</span>}
                                </div>
                                {sed.blocchi.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">Nessun blocco</p>
                                ) : sed.blocchi.map((b, bi) => (
                                  <div key={bi} className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs">
                                      {b.nome && <span className="font-bold text-foreground">{b.nome}</span>}
                                      {b.minuti && <span className="ml-auto text-muted-foreground flex-shrink-0">{b.minuti}min</span>}
                                    </div>
                                    {(b.fondamentali || []).length > 0 && (
                                      <div className="flex gap-1 flex-wrap">
                                        {(b.fondamentali || []).map(f => (
                                          <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{f}</span>
                                        ))}
                                        {b.forma && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{b.forma}</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifica struttura' : 'Nuova struttura settimanale'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Nome e descrizione */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. U16 — 3 sedute fase agonistica" /></div>
              <div className="col-span-2"><Label>Descrizione</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Nota opzionale..." /></div>
            </div>

            {/* Tipo struttura */}
            <div>
              <Label className="mb-2 block">Tipo struttura</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TIPI_STRUTTURA.map(t => (
                  <button key={t.id} onClick={() => changeNSettimane(t.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${nSettimane === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <p className="text-xs font-bold">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sedute per settimana */}
            <div>
              <Label className="mb-2 block">Sedute per settimana</Label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => changeNSedute(n)}
                    className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${nSedute === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Settimane e sedute */}
            {Array.from({ length: nSettimane }, (_, wi) => (
              <div key={wi} className="space-y-3">
                {nSettimane > 1 && (
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">
                    Settimana {wi + 1} {nSettimane === 2 ? (wi === 0 ? '(A)' : '(B)') : ''}
                  </p>
                )}
                <div className="space-y-3">
                  {settimane[wi]?.sedute.map((sed, si) => (
                    <div key={si} className="border border-border rounded-lg p-3 space-y-2">
                      {/* Giorno */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-muted-foreground w-16">Seduta {si + 1}</span>
                        <div className="flex gap-1 flex-wrap">
                          {GIORNI.map((g, gi) => (
                            <button key={gi} onClick={() => updateGiorno(wi, si, gi)}
                              className={`w-8 h-7 rounded text-[10px] font-bold transition-colors border ${sed.giorno === gi ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Blocchi */}
                      <div className="space-y-1.5">
                        {sed.blocchi.map((b, bi) => (
                          <div key={bi} className="border border-border/60 rounded-lg p-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={b.nome}
                                onChange={e => updateBlocco(wi, si, bi, 'nome', e.target.value)}
                                placeholder="Nome blocco (es. Ricezione + Attacco)..."
                                className="flex-1 h-8 text-xs"
                              />
                              <Input type="number" min={5} max={120} value={b.minuti} onChange={e => updateBlocco(wi, si, bi, 'minuti', e.target.value)}
                                placeholder="min" className="w-16 h-8 text-xs text-center" />
                              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeBlocco(wi, si, bi)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {FONDAMENTALI.map(f => (
                                <button key={f} type="button" onClick={() => toggleFondamentale(wi, si, bi, f)}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors font-semibold ${
                                    (b.fondamentali || []).includes(f)
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'border-border text-muted-foreground hover:border-primary'
                                  }`}>
                                  {f}
                                </button>
                              ))}
                            </div>
                            <Select value={b.forma} onValueChange={v => updateBlocco(wi, si, bi, 'forma', v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Forma di lavoro..." /></SelectTrigger>
                              <SelectContent>{FORME.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full h-7 text-xs border border-dashed border-border" onClick={() => addBlocco(wi, si)}>
                          + Aggiungi blocco
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={save}>{editing ? 'Salva modifiche' : 'Salva struttura'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert delete */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere struttura?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSt} className="bg-destructive text-destructive-foreground">Rimuovi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
