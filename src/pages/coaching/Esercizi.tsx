import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FUNDAMENTALS } from '@/lib/volleyConstants';
import { TagPicker } from '@/components/TagPicker';
import {
  Dumbbell, Plus, Pencil, Trash2, Search, Download, Upload, Loader2, Tag, Clock, Link as LinkIcon, X,
} from 'lucide-react';

interface Exercise {
  id: string;
  society_id: string;
  created_by: string;
  name: string;
  description: string | null;
  fundamental: string | null;
  duration_min: number | null;
  intensity: string | null;
  equipment: string | null;
  video_url: string | null;
  tags: string[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

const ALL = '__ALL__';
const NONE = '__NONE__';
const INTENSITIES = ['Bassa', 'Media', 'Alta', 'Massimale'] as const;

interface ExportPayload {
  format: 'volley-coach.exercises';
  version: 1;
  exported_at: string;
  exported_from_society: string | null;
  count: number;
  exercises: Array<Omit<Exercise, 'id' | 'society_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_shared'>>;
}

export default function Esercizi() {
  const { user } = useAuth();
  const { societyId, societyName, isAdmin, loading: socLoading } = useActiveSociety();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [search, setSearch] = useState('');
  const [fFund, setFFund] = useState<string>(ALL);
  const [fIntensity, setFIntensity] = useState<string>(ALL);
  const [fTags, setFTags] = useState<string[]>([]); // filtro multi-tag (AND)

  // Dialog form
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fundamental, setFundamental] = useState<string>(NONE);
  const [duration, setDuration] = useState<string>('');
  const [intensity, setIntensity] = useState<string>(NONE);
  const [equipment, setEquipment] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import
  const [importing, setImporting] = useState(false);

  const load = async () => {
    if (!societyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('society_id', societyId)
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Errore caricamento', description: error.message, variant: 'destructive' });
    }
    setItems((data || []) as Exercise[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const tagFilters = fTags.map((t) => t.toLowerCase());
    return items.filter((it) => {
      if (s && !(
        it.name.toLowerCase().includes(s) ||
        (it.description || '').toLowerCase().includes(s) ||
        it.tags.some((t) => t.toLowerCase().includes(s))
      )) return false;
      if (fFund !== ALL && it.fundamental !== fFund) return false;
      if (fIntensity !== ALL && it.intensity !== fIntensity) return false;
      if (tagFilters.length > 0) {
        const lower = it.tags.map((t) => t.toLowerCase());
        if (!tagFilters.every((t) => lower.includes(t))) return false;
      }
      return true;
    });
  }, [items, search, fFund, fIntensity, fTags]);

  // Tag già usati nella società (per autocomplete TagPicker)
  const allUsedTags = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.tags))),
    [items]
  );

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFundamental(NONE);
    setDuration('');
    setIntensity(NONE);
    setEquipment('');
    setVideoUrl('');
    setTagsInput('');
  };

  const openCreate = () => {
    resetForm();
    setDlgOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setName(ex.name);
    setDescription(ex.description || '');
    setFundamental(ex.fundamental || NONE);
    setDuration(ex.duration_min?.toString() || '');
    setIntensity(ex.intensity || NONE);
    setEquipment(ex.equipment || '');
    setVideoUrl(ex.video_url || '');
    setTagsInput(ex.tags.join(', '));
    setDlgOpen(true);
  };

  const submit = async () => {
    if (!user || !societyId) return;
    if (!name.trim()) {
      toast({ title: 'Nome obbligatorio', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      fundamental: fundamental === NONE ? null : fundamental,
      duration_min: duration ? parseInt(duration, 10) : null,
      intensity: intensity === NONE ? null : intensity,
      equipment: equipment.trim() || null,
      video_url: videoUrl.trim() || null,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const { error } = editing
      ? await supabase.from('exercises').update(payload).eq('id', editing.id)
      : await supabase.from('exercises').insert({ ...payload, society_id: societyId, created_by: user.id });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Esercizio aggiornato' : 'Esercizio creato' });
    setDlgOpen(false);
    resetForm();
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('exercises').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Errore eliminazione', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Esercizio eliminato' });
      load();
    }
    setDeleteId(null);
  };

  // ---------- Export ----------
  const handleExport = () => {
    if (items.length === 0) {
      toast({ title: 'Niente da esportare', description: 'Nessun esercizio nella società attiva.' });
      return;
    }
    const payload: ExportPayload = {
      format: 'volley-coach.exercises',
      version: 1,
      exported_at: new Date().toISOString(),
      exported_from_society: societyName,
      count: items.length,
      exercises: items.map((e) => ({
        name: e.name,
        description: e.description,
        fundamental: e.fundamental,
        duration_min: e.duration_min,
        intensity: e.intensity,
        equipment: e.equipment,
        video_url: e.video_url,
        tags: e.tags,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (societyName || 'societa').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `esercizi-${safe}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Esportazione completata', description: `${items.length} esercizi scaricati` });
  };

  // ---------- Import ----------
  const triggerImport = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset così si può reimportare lo stesso file
    if (!file || !user || !societyId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ExportPayload>;
      if (parsed.format !== 'volley-coach.exercises' || !Array.isArray(parsed.exercises)) {
        throw new Error('Formato file non riconosciuto');
      }
      const rows = parsed.exercises
        .filter((ex) => ex && typeof ex.name === 'string' && ex.name.trim())
        .map((ex) => ({
          society_id: societyId,
          created_by: user.id,
          name: String(ex.name).trim(),
          description: ex.description ?? null,
          fundamental: ex.fundamental ?? null,
          duration_min: typeof ex.duration_min === 'number' ? ex.duration_min : null,
          intensity: ex.intensity ?? null,
          equipment: ex.equipment ?? null,
          video_url: ex.video_url ?? null,
          tags: Array.isArray(ex.tags) ? ex.tags.filter((t) => typeof t === 'string') : [],
        }));
      if (rows.length === 0) throw new Error('Nessun esercizio valido nel file');
      const { error } = await supabase.from('exercises').insert(rows);
      if (error) throw error;
      toast({
        title: 'Importazione completata',
        description: `${rows.length} esercizi aggiunti${parsed.exported_from_society ? ` (da ${parsed.exported_from_society})` : ''}`,
      });
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore import';
      toast({ title: 'Importazione fallita', description: msg, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // ---------- Render ----------
  if (socLoading) {
    return (
      <div className="container py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  if (!societyId) {
    return (
      <div className="container py-10">
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">Nessuna società attiva</h3>
          <p className="text-sm text-muted-foreground">Devi appartenere a una società per gestire gli esercizi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
            <Dumbbell className="w-9 h-9 text-primary" />
            Libreria esercizi
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Esercizi della società <strong className="text-foreground">{societyName}</strong>. Esporta in JSON per condividerli con altre società o importane da un file esterno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" onClick={triggerImport} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importa JSON
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={items.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Esporta ({items.length})
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nuovo esercizio
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, descrizione, tag…"
            className="pl-9"
          />
        </div>
        <Select value={fFund} onValueChange={setFFund}>
          <SelectTrigger><SelectValue placeholder="Fondamentale" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i fondamentali</SelectItem>
            {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fIntensity} onValueChange={setFIntensity}>
          <SelectTrigger><SelectValue placeholder="Intensità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutte le intensità</SelectItem>
            {INTENSITIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento esercizi…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">
            {items.length === 0 ? 'Nessun esercizio' : 'Nessun risultato'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {items.length === 0
              ? 'Crea il primo esercizio o importa un file JSON.'
              : 'Modifica i filtri o cerca altri termini.'}
          </p>
          {items.length === 0 && (
            <div className="flex justify-center gap-2">
              <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Crea esercizio</Button>
              <Button variant="outline" onClick={triggerImport} className="gap-2"><Upload className="w-4 h-4" /> Importa JSON</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ex) => {
            const canEdit = ex.created_by === user?.id || isAdmin;
            return (
              <article
                key={ex.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black italic uppercase tracking-tight leading-tight truncate">{ex.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ex.fundamental && (
                        <Badge variant="outline" className="border-primary/30 text-primary text-xs">{ex.fundamental}</Badge>
                      )}
                      {ex.intensity && (
                        <Badge variant="outline" className="text-xs">{ex.intensity}</Badge>
                      )}
                      {ex.duration_min != null && (
                        <Badge variant="outline" className="text-xs gap-1"><Clock className="w-3 h-3" />{ex.duration_min}′</Badge>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ex)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(ex.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </header>

                {ex.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{ex.description}</p>
                )}

                {(ex.equipment || ex.video_url) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {ex.equipment && <div><span className="font-semibold">Attrezzatura:</span> {ex.equipment}</div>}
                    {ex.video_url && (
                      <a
                        href={ex.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" /> Video
                      </a>
                    )}
                  </div>
                )}

                {ex.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ex.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs gap-1">
                        <Tag className="w-2.5 h-2.5" />{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog create/edit */}
      <Dialog open={dlgOpen} onOpenChange={(o) => { if (!o) resetForm(); setDlgOpen(o); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">
              {editing ? 'Modifica esercizio' : 'Nuovo esercizio'}
            </DialogTitle>
            <DialogDescription>
              Compila i campi. Solo il nome è obbligatorio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ex-name">Nome *</Label>
              <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es: 3 vs 3 con cambio palla" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ex-desc">Descrizione</Label>
              <Textarea id="ex-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Fondamentale</Label>
                <Select value={fundamental} onValueChange={setFundamental}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Intensità</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {INTENSITIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ex-dur">Durata (min)</Label>
                <Input id="ex-dur" type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="15" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ex-eq">Attrezzatura</Label>
                <Input id="ex-eq" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Es: 6 palloni, coni" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ex-vid">Video URL</Label>
                <Input id="ex-vid" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ex-tags">Tag (separati da virgola)</Label>
              <Input id="ex-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="riscaldamento, situazionale" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)} disabled={submitting}>Annulla</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio…</> : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'esercizio?</AlertDialogTitle>
            <AlertDialogDescription>L'azione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
