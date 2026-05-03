import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { FUNDAMENTALS, AGE_GROUPS, FUNDAMENTAL_COLOR } from '@/lib/volleyConstants';

interface Guideline {
  id: string;
  society_id: string;
  title: string;
  content: string;
  category: string | null;
  fundamental: string | null;
  age_group: string | null;
  difficulty: string | null;
  video_url: string | null;
  duration_min: number | null;
  common_errors: string | null;
  progression: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const DIFFICULTIES = ['Principiante', 'Intermedio', 'Avanzato'] as const;

const ALL = '__ALL__';
const NONE = '__NONE__';

export default function GuidaTecnica() {
  const { user } = useAuth();
  const { societyId, isAdmin, loading: socLoading } = useActiveSociety();
  const { toast } = useToast();

  const [items, setItems] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [fFund, setFFund] = useState<string>(ALL);
  const [fAge, setFAge] = useState<string>(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guideline | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '',
    fundamental: NONE,
    age_group: NONE,
    difficulty: NONE,
    video_url: '',
    duration_min: '',
    common_errors: '',
    progression: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!societyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_guidelines')
      .select('*')
      .eq('society_id', societyId)
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Errore caricamento', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as Guideline[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (societyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((g) => {
      if (fFund !== ALL && g.fundamental !== fFund) return false;
      if (fAge !== ALL && g.age_group !== fAge) return false;
      if (s) {
        const hay = `${g.title} ${g.content} ${g.category ?? ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [items, search, fFund, fAge]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: '', fundamental: NONE, age_group: NONE, difficulty: NONE, video_url: '', duration_min: '', common_errors: '', progression: '', tags: '' });
    setDialogOpen(true);
  };

  const openEdit = (g: Guideline) => {
    setEditing(g);
    setForm({
      title: g.title,
      content: g.content,
      category: g.category ?? '',
      fundamental: g.fundamental ?? NONE,
      age_group: g.age_group ?? NONE,
      difficulty: g.difficulty ?? NONE,
      video_url: g.video_url ?? '',
      duration_min: g.duration_min != null ? String(g.duration_min) : '',
      common_errors: g.common_errors ?? '',
      progression: g.progression ?? '',
      tags: (g.tags || []).join(', '),
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!societyId || !user) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Compila titolo e contenuto', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      society_id: societyId,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim() || null,
      fundamental: form.fundamental === NONE ? null : form.fundamental,
      age_group: form.age_group === NONE ? null : form.age_group,
      difficulty: form.difficulty === NONE ? null : form.difficulty,
      video_url: form.video_url.trim() || null,
      duration_min: form.duration_min ? parseInt(form.duration_min, 10) : null,
      common_errors: form.common_errors.trim() || null,
      progression: form.progression.trim() || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const { error } = editing
      ? await supabase.from('technical_guidelines').update(payload).eq('id', editing.id)
      : await supabase.from('technical_guidelines').insert({ ...payload, created_by: user.id });

    setSaving(false);
    if (error) {
      toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Guida aggiornata' : 'Guida creata' });
    setDialogOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('technical_guidelines').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Errore eliminazione', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Guida eliminata' });
      load();
    }
    setDeleteId(null);
  };

  if (socLoading) {
    return <div className="container py-10 text-muted-foreground">Caricamento società…</div>;
  }
  if (!societyId) {
    return (
      <div className="container py-10 space-y-3">
        <p className="text-muted-foreground">
          Nessuna società attiva trovata. Crea prima una società dall'area admin.
        </p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Coaching</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
            <BookOpen className="w-9 h-9 text-primary" />
            Guida Tecnica
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Linee guida tecniche della società, organizzate per fondamentale e fascia d'età.
            {!isAdmin && ' Solo gli admin di società possono creare o modificare le guide.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nuova guida
          </Button>
        )}
      </div>

      {/* Filtri */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo, contenuto, tag…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={fFund} onValueChange={setFFund}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Fondamentale" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i fondamentali</SelectItem>
              {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fAge} onValueChange={setFAge}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fascia età" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutte le fasce</SelectItem>
              {AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-muted-foreground">Caricamento…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">
            {items.length === 0 ? 'Nessuna guida ancora' : 'Nessun risultato'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? (isAdmin ? 'Crea la prima guida tecnica per la tua società.' : 'L\'admin non ha ancora pubblicato guide.')
              : 'Modifica i filtri per vedere altre guide.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const canEdit = isAdmin; // RLS: solo admin può editare
            const fundColor = g.fundamental ? FUNDAMENTAL_COLOR[g.fundamental] : '';
            return (
              <article
                key={g.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <header className="flex items-start justify-between gap-2">
                  <h3 className="font-bold uppercase italic tracking-tight leading-tight">{g.title}</h3>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)} aria-label="Modifica">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(g.id)} aria-label="Elimina">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </header>

                <div className="flex flex-wrap gap-1.5">
                  {g.fundamental && (
                    <Badge variant="outline" className={fundColor}>{g.fundamental}</Badge>
                  )}
                  {g.age_group && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {g.age_group}
                    </Badge>
                  )}
                  {g.category && <Badge variant="secondary">{g.category}</Badge>}
                  {g.difficulty && (
                    <Badge variant="outline" className="border-accent/40 text-accent text-xs">{g.difficulty}</Badge>
                  )}
                  {g.duration_min != null && (
                    <Badge variant="outline" className="text-xs">{g.duration_min}′</Badge>
                  )}
                  {(g.tags || []).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>

                {g.video_url && (
                  <a href={g.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    🎬 Video tutorial
                  </a>
                )}

                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {g.content}
                </p>

                <footer className="text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border/50">
                  Aggiornata il {new Date(g.updated_at).toLocaleDateString('it-IT')}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">
              {editing ? 'Modifica guida' : 'Nuova guida tecnica'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Es: Tecnica di battuta in salto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fondamentale</Label>
                <Select value={form.fundamental} onValueChange={(v) => setForm({ ...form, fundamental: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {FUNDAMENTALS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Fascia d'età</Label>
                <Select value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cat">Categoria</Label>
                <Input
                  id="cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Es: Tecnica individuale"
                />
              </div>
              <div className="grid gap-2">
                <Label>Difficoltà</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dur">Durata (min)</Label>
                <Input
                  id="dur"
                  type="number"
                  min="0"
                  value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                  placeholder="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vid">Video URL</Label>
                <Input
                  id="vid"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/…"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tag (separati da virgola)</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="es: float, topspin, principiante"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Contenuto *</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                placeholder="Descrizione tecnica, progressioni didattiche…"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="errors">Errori comuni</Label>
              <Textarea
                id="errors"
                value={form.common_errors}
                onChange={(e) => setForm({ ...form, common_errors: e.target.value })}
                rows={3}
                placeholder="Es. Gomiti non paralleli, piedi non orientati verso l'alzatrice"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prog">Progressione didattica</Label>
              <Textarea
                id="prog"
                value={form.progression}
                onChange={(e) => setForm({ ...form, progression: e.target.value })}
                rows={2}
                placeholder="Es. 1) Fermo, 2) In movimento, 3) Con opposizione"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annulla</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa guida?</AlertDialogTitle>
            <AlertDialogDescription>L'azione è permanente e non può essere annullata.</AlertDialogDescription>
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
