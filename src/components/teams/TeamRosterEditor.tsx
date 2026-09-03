import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, Settings2, Trash2, UserMinus, X } from 'lucide-react';
import { toast } from 'sonner';

export const ROSTER_ROLES = ['Palleggiatrice', 'Opposto', 'Schiacciatrice', 'Centrale', 'Libero', 'Universale'];

export type RosterSort = 'alfabetico' | 'ruolo' | 'anno' | 'numero';

const SORT_LABELS: Record<RosterSort, string> = {
  alfabetico: 'Alfabetico',
  ruolo: 'Per ruolo',
  anno: 'Per anno di nascita',
  numero: 'Per numero di maglia',
};

const SORT_KEY = 'team_roster_sort_v1';
const ROLES_KEY = 'team_roster_roles_v1';

function loadTeamRoles(teamId: string): string[] {
  try {
    const raw = localStorage.getItem(`${ROLES_KEY}:${teamId}`);
    if (!raw) return [...ROSTER_ROLES];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((r) => typeof r === 'string') && parsed.length) return parsed;
  } catch { /* ignore */ }
  return [...ROSTER_ROLES];
}

export interface RosterAthlete {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  number: number | null;
  birth_date: string | null;
}

interface Props {
  teamId: string;
  societyId: string | null;
  athletes: RosterAthlete[];
  onChanged: () => void;
}

interface FormState {
  id?: string;
  last_name: string;
  first_name: string;
  role: string;
  number: string;
  birth_date: string;
}

const EMPTY: FormState = { last_name: '', first_name: '', role: '', number: '', birth_date: '' };

export function TeamRosterEditor({ teamId, societyId, athletes, onChanged }: Props) {
  const [sort, setSort] = useState<RosterSort>(() => {
    const raw = localStorage.getItem(SORT_KEY);
    return (raw as RosterSort) || 'alfabetico';
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>(() => loadTeamRoles(teamId));
  const [rolesOpen, setRolesOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  const persistRoles = (next: string[]) => {
    setRoles(next);
    try { localStorage.setItem(`${ROLES_KEY}:${teamId}`, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const addRole = () => {
    const r = newRole.trim();
    if (!r) return;
    if (roles.some((x) => x.toLowerCase() === r.toLowerCase())) {
      toast.error('Ruolo già presente');
      return;
    }
    persistRoles([...roles, r]);
    setNewRole('');
  };

  const removeRole = (r: string) => {
    if (roles.length <= 1) { toast.error('Deve restare almeno un ruolo'); return; }
    persistRoles(roles.filter((x) => x !== r));
  };

  const assignRole = async (a: RosterAthlete, value: string) => {
    const role = value === 'none' ? null : value;
    const { error } = await supabase
      .from('athletes')
      .update({ role, is_libero: role === 'Libero' })
      .eq('id', a.id);
    if (error) toast.error('Errore', { description: error.message });
    else { toast.success('Ruolo aggiornato'); onChanged(); }
  };

  const changeSort = (v: RosterSort) => {
    setSort(v);
    try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ }
  };


  const sorted = useMemo(() => {
    const list = [...athletes];
    const name = (a: RosterAthlete) => `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim().toLowerCase();
    const year = (a: RosterAthlete) => (a.birth_date ? new Date(a.birth_date).getFullYear() : 9999);
    switch (sort) {
      case 'numero':
        return list.sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || name(a).localeCompare(name(b)));
      case 'anno':
        return list.sort((a, b) => year(a) - year(b) || name(a).localeCompare(name(b)));
      case 'ruolo':
        return list.sort((a, b) => {
          const ia = a.role ? roles.indexOf(a.role) : 99;
          const ib = b.role ? roles.indexOf(b.role) : 99;
          return (ia < 0 ? 98 : ia) - (ib < 0 ? 98 : ib) || name(a).localeCompare(name(b));
        });
      default:
        return list.sort((a, b) => name(a).localeCompare(name(b)));
    }
  }, [athletes, sort, roles]);

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (a: RosterAthlete) => {
    setForm({
      id: a.id,
      last_name: a.last_name ?? '',
      first_name: a.first_name ?? '',
      role: a.role ?? '',
      number: a.number != null ? String(a.number) : '',
      birth_date: a.birth_date ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.last_name.trim()) {
      toast.error('Il cognome è obbligatorio');
      return;
    }
    setSaving(true);
    const payload = {
      last_name: form.last_name.trim(),
      first_name: form.first_name.trim() || null,
      role: form.role || null,
      number: form.number ? parseInt(form.number, 10) : null,
      birth_date: form.birth_date || null,
      is_libero: form.role === 'Libero',
    };
    try {
      if (form.id) {
        const { error } = await supabase.from('athletes').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (!societyId || !userData.user) throw new Error('Società non disponibile');
        const { error } = await supabase.from('athletes').insert({
          ...payload,
          team_id: teamId,
          society_id: societyId,
          coach_id: userData.user.id,
        });
        if (error) throw error;
      }
      toast.success('Rosa aggiornata');
      setOpen(false);
      onChanged();
    } catch (e) {
      toast.error('Errore salvataggio', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const removeFromTeam = async (a: RosterAthlete) => {
    if (!confirm(`Rimuovere ${a.last_name} dalla squadra? L'atleta resta in anagrafica.`)) return;
    const { error } = await supabase.from('athletes').update({ team_id: null }).eq('id', a.id);
    if (error) toast.error('Errore', { description: error.message });
    else { toast.success('Atleta rimosso dalla squadra'); onChanged(); }
  };

  const deleteAthlete = async (a: RosterAthlete) => {
    if (!confirm(`Eliminare definitivamente ${a.last_name}? Operazione irreversibile.`)) return;
    const { error } = await supabase.from('athletes').delete().eq('id', a.id);
    if (error) toast.error('Errore', { description: error.message });
    else { toast.success('Atleta eliminato'); onChanged(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-lg font-bold uppercase italic">Rosa atleti</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => changeSort(v as RosterSort)}>
            <SelectTrigger className="h-9 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as RosterSort[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setRolesOpen(true)} className="gap-1">
            <Settings2 className="w-4 h-4" /> Ruoli
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Atleta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun atleta assegnato.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {sorted.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm group">
                <span className="w-8 text-center font-black text-primary">{a.number ?? '—'}</span>
                <span className="flex-1 font-semibold truncate">
                  {a.last_name} {a.first_name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                  {a.birth_date ? new Date(a.birth_date).getFullYear() : '—'}
                </span>
                {a.role && <Badge variant="outline">{a.role}</Badge>}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)} title="Modifica">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeFromTeam(a)} title="Rimuovi dalla squadra">
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAthlete(a)} title="Elimina atleta">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifica atleta' : 'Nuovo atleta'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cognome</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Numero maglia</Label>
              <Input type="number" min={0} max={99} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data di nascita</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Ruolo</Label>
              <Select value={form.role || 'none'} onValueChange={(v) => setForm({ ...form, role: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona ruolo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {ROSTER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
