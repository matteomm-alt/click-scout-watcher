import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Save, Users, CalendarRange } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCurrentSeason } from '@/hooks/useCurrentSeason';

export interface TeamDetail {
  id: string;
  name: string;
  category: string | null;
  age_group: string | null;
  season: string | null;
}

export interface RosterLite {
  id: string;
  role: string | null;
  birth_date: string | null;
}

export interface TrainingLite {
  id: string;
  title: string | null;
  scheduled_date: string | null;
  status: string | null;
}

interface Props {
  team: TeamDetail;
  athletes: RosterLite[];
  trainings: TrainingLite[];
  onSaved?: (t: TeamDetail) => void;
}

export function TeamDetailCard({ team, athletes, trainings, onSaved }: Props) {
  const { availableSeasons, currentSeason } = useCurrentSeason();
  const [form, setForm] = useState<TeamDetail>(team);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(team); }, [team]);

  const seasonOptions = Array.from(new Set([
    ...availableSeasons,
    currentSeason,
    ...(form.season ? [form.season] : []),
  ])).sort().reverse();

  const roleCounts = new Map<string, number>();
  athletes.forEach((a) => {
    const r = a.role?.trim() || 'Senza ruolo';
    roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  });

  const years = athletes
    .map((a) => (a.birth_date ? new Date(a.birth_date).getFullYear() : null))
    .filter((y): y is number => !!y);
  const yearRange = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('teams')
      .update({
        name: form.name,
        category: form.category,
        age_group: form.age_group,
        season: form.season,
      })
      .eq('id', team.id);
    setSaving(false);
    if (error) {
      toast.error('Salvataggio non riuscito');
      return;
    }
    toast.success('Scheda squadra aggiornata');
    onSaved?.(form);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black italic uppercase tracking-tight">Scheda squadra</h2>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> Salva scheda
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="team-name">Nome squadra</Label>
          <Input
            id="team-name"
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-cat">Categoria</Label>
          <Input
            id="team-cat"
            placeholder="Es. Serie C"
            value={form.category ?? ''}
            onChange={(e) => setForm({ ...form, category: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-age">Fascia d'età</Label>
          <Input
            id="team-age"
            placeholder="Es. Under 16"
            value={form.age_group ?? ''}
            onChange={(e) => setForm({ ...form, age_group: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Stagione</Label>
          <Select
            value={form.season ?? ''}
            onValueChange={(v) => setForm({ ...form, season: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleziona stagione" /></SelectTrigger>
            <SelectContent>
              {seasonOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase italic tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Rosa e ruoli
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary">{athletes.length}</span>
            <span className="text-sm text-muted-foreground">
              atlete/i{yearRange ? ` · anni ${yearRange}` : ''}
            </span>
          </div>
          {roleCounts.size === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun atleta in rosa.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(roleCounts.entries()).map(([role, n]) => (
                <Badge key={role} variant="secondary" className="text-sm py-1.5 px-3">
                  <span className="font-bold uppercase">{role}</span>
                  <span className="ml-2 text-primary font-black">{n}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase italic tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" /> Allenamenti collegati
            </p>
            <Link to="/allenamenti" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Vedi tutti <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {trainings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun allenamento collegato a questa squadra.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {trainings.slice(0, 5).map((t) => (
                <li key={t.id} className="py-2 text-sm flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">
                    {t.scheduled_date ?? '—'}
                  </span>
                  <Link to={`/allenamenti/${t.id}`} className="flex-1 font-semibold truncate hover:underline">
                    {t.title ?? 'Senza titolo'}
                  </Link>
                  {t.status && <Badge variant="outline">{t.status}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
