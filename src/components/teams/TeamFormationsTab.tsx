import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  EMPTY_ROTATION_BASE, POS_KEYS, derivedRotations, isRotationComplete,
  parseRotationBase, type PosKey, type RotationBase,
} from '@/lib/teamRotations';
import type { RosterAthlete } from '@/components/teams/TeamRosterEditor';

interface Props {
  teamId: string;
  societyId: string | null;
  athletes: RosterAthlete[];
}

interface TeamFormation {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  rotations: RotationBase;
}

const POS_LABELS: Record<PosKey, string> = {
  p1: 'P1 · fondo destra',
  p2: 'P2 · rete destra',
  p3: 'P3 · rete centro',
  p4: 'P4 · rete sinistra',
  p5: 'P5 · fondo sinistra',
  p6: 'P6 · fondo centro',
};

const athleteLabel = (a: RosterAthlete) =>
  `${a.number != null ? `#${a.number} ` : ''}${a.last_name ?? ''} ${a.first_name ?? ''}`.trim();

export function TeamFormationsTab({ teamId, societyId, athletes }: Props) {
  const [formations, setFormations] = useState<TeamFormation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [base, setBase] = useState<RotationBase>(EMPTY_ROTATION_BASE);
  const [saving, setSaving] = useState(false);

  const numbered = useMemo(() => athletes.filter((a) => a.number != null), [athletes]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('formation_templates')
      .select('id, name, description, is_default, rotations')
      .eq('team_id', teamId)
      .order('name');
    setLoading(false);
    if (error) { toast.error('Errore caricamento formazioni', { description: error.message }); return; }
    const rows = (data ?? [])
      .map((r) => ({
        id: r.id as string,
        name: r.name as string,
        description: (r.description ?? null) as string | null,
        is_default: Boolean((r as { is_default?: boolean }).is_default),
        rotations: parseRotationBase((r as { rotations?: unknown }).rotations) ?? EMPTY_ROTATION_BASE,
      }));
    setFormations(rows);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setBase(EMPTY_ROTATION_BASE);
    setDialogOpen(true);
  };

  const openEdit = (f: TeamFormation) => {
    setEditingId(f.id);
    setName(f.name);
    setDescription(f.description ?? '');
    setBase(f.rotations);
    setDialogOpen(true);
  };

  const assign = (key: PosKey | 'setter' | 'libero', value: number | null) => {
    setBase((prev) => {
      const next = { ...prev, [key]: value };
      if (key !== 'setter' && key !== 'libero' && value != null) {
        // un giocatore può occupare una sola posizione
        POS_KEYS.forEach((k) => { if (k !== key && next[k] === value) next[k] = null; });
      }
      return next;
    });
  };

  const save = async () => {
    if (!societyId) { toast.error('Società non disponibile'); return; }
    if (!name.trim()) { toast.error('Inserisci un nome'); return; }
    if (!isRotationComplete(base)) {
      toast.error('Formazione incompleta', { description: 'Assegna i 6 posti e indica il palleggiatore.' });
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      rotations: base as unknown as never,
    };
    if (editingId) {
      const { error } = await supabase.from('formation_templates').update(payload).eq('id', editingId);
      setSaving(false);
      if (error) { toast.error('Errore salvataggio', { description: error.message }); return; }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setSaving(false); toast.error('Sessione scaduta'); return; }
      const { error } = await supabase.from('formation_templates').insert({
        ...payload,
        society_id: societyId,
        team_id: teamId,
        created_by: userData.user.id,
        template_type: 'reception',
        is_default: formations.length === 0,
      });
      setSaving(false);
      if (error) { toast.error('Errore salvataggio', { description: error.message }); return; }
    }
    toast.success('Formazione salvata');
    setDialogOpen(false);
    load();
  };

  const remove = async (f: TeamFormation) => {
    if (!confirm(`Eliminare la formazione "${f.name}"?`)) return;
    const { error } = await supabase.from('formation_templates').delete().eq('id', f.id);
    if (error) { toast.error('Errore eliminazione', { description: error.message }); return; }
    toast.success('Formazione eliminata');
    load();
  };

  const setDefault = async (f: TeamFormation) => {
    const { error: clearError } = await supabase
      .from('formation_templates')
      .update({ is_default: false })
      .eq('team_id', teamId);
    if (clearError) { toast.error('Errore', { description: clearError.message }); return; }
    const { error } = await supabase
      .from('formation_templates')
      .update({ is_default: true })
      .eq('id', f.id);
    if (error) { toast.error('Errore', { description: error.message }); return; }
    toast.success(`"${f.name}" è la formazione predefinita`);
    load();
  };

  const nameOf = (num: number | null) => {
    if (num == null) return '—';
    const a = numbered.find((x) => x.number === num);
    return a ? `${num} ${a.last_name ?? ''}`.trim() : String(num);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg font-bold uppercase italic">Formazioni</CardTitle>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" /> Nuova formazione
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : formations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna formazione. Creane una: le 6 rotazioni vengono calcolate automaticamente e
            applicate al campo nello scout live (battuta → ricezione).
          </p>
        ) : (
          formations.map((f) => {
            const rotations = isRotationComplete(f.rotations) ? derivedRotations(f.rotations) : [];
            return (
              <div key={f.id} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{f.name}</span>
                  {f.is_default && <Badge className="bg-primary/20 text-primary border-primary/40">Predefinita</Badge>}
                  {f.rotations.libero != null && (
                    <Badge variant="outline">Libero {f.rotations.libero}</Badge>
                  )}
                  {f.rotations.setter != null && (
                    <Badge variant="secondary">Palleggiatore {f.rotations.setter}</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {!f.is_default && (
                      <Button variant="ghost" size="icon" aria-label="Imposta predefinita" onClick={() => setDefault(f)}>
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => openEdit(f)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Elimina" onClick={() => remove(f)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                {rotations.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rotations.map((r) => (
                      <div key={r.steps} className="rounded-md bg-muted/40 p-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                          Rotazione P{r.setterPosition} (palleggiatore)
                        </p>
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                          {(['p4', 'p3', 'p2', 'p5', 'p6', 'p1'] as PosKey[]).map((k) => (
                            <div key={k} className="rounded bg-background/70 px-1.5 py-1 truncate">
                              <span className="text-muted-foreground">{k.toUpperCase()} </span>
                              {nameOf(r.positions[k])}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifica formazione' : 'Nuova formazione'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="formation-name">Nome</Label>
              <Input id="formation-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. 5-1 titolare" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formation-desc">Note</Label>
              <Input id="formation-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opzionale" />
            </div>
            {numbered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Assegna prima i numeri di maglia agli atleti della rosa.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {POS_KEYS.map((k) => (
                    <div key={k} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{POS_LABELS[k]}</Label>
                      <Select
                        value={base[k] != null ? String(base[k]) : 'none'}
                        onValueChange={(v) => assign(k, v === 'none' ? null : Number(v))}
                      >
                        <SelectTrigger><SelectValue placeholder="Scegli" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {numbered.map((a) => (
                            <SelectItem key={a.id} value={String(a.number)}>{athleteLabel(a)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Palleggiatore</Label>
                    <Select
                      value={base.setter != null ? String(base.setter) : 'none'}
                      onValueChange={(v) => assign('setter', v === 'none' ? null : Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Scegli" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {POS_KEYS.map((k) => base[k]).filter((n): n is number => n != null).map((n) => (
                          <SelectItem key={n} value={String(n)}>{nameOf(n)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Libero</Label>
                    <Select
                      value={base.libero != null ? String(base.libero) : 'none'}
                      onValueChange={(v) => assign('libero', v === 'none' ? null : Number(v))}
                    >
                      <SelectTrigger><SelectValue placeholder="Scegli" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {numbered.map((a) => (
                          <SelectItem key={a.id} value={String(a.number)}>{athleteLabel(a)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={save} disabled={saving}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
