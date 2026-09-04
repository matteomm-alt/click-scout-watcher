import { Link } from 'react-router-dom';
import { ExternalLink, Target, CalendarRange, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface ObjectiveLite {
  id: string; title: string; status: string; phase_id: string | null;
}
export interface PhaseLite {
  id: string; name: string; start_date: string | null; end_date: string | null; plan_name: string;
}
export interface SchemeLite {
  id: string; name: string; fundamental: string | null;
}
export interface SkeletonLite {
  id: string; name: string;
}

export interface TrainingDetailValue {
  objective_id: string | null;
  phase_id: string | null;
  scheme_ids: string[];
}

interface Props {
  value: TrainingDetailValue;
  onChange: (v: TrainingDetailValue) => void;
  objectives: ObjectiveLite[];
  phases: PhaseLite[];
  schemes: SchemeLite[];
  skeleton?: SkeletonLite | null;
}

const NONE = '__none__';

export function TrainingDetailCard({ value, onChange, objectives, phases, schemes, skeleton }: Props) {
  const selectedSchemes = schemes.filter((s) => value.scheme_ids.includes(s.id));

  const toggleScheme = (id: string) => {
    const next = value.scheme_ids.includes(id)
      ? value.scheme_ids.filter((s) => s !== id)
      : [...value.scheme_ids, id];
    onChange({ ...value, scheme_ids: next });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black italic uppercase tracking-tight">Scheda allenamento</h2>
        {skeleton && (
          <Link to="/scheletri" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Scheletro: {skeleton.name} <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Target className="w-3.5 h-3.5" /> Obiettivo collegato
          </Label>
          <Select
            value={value.objective_id ?? NONE}
            onValueChange={(v) => onChange({ ...value, objective_id: v === NONE ? null : v })}
          >
            <SelectTrigger><SelectValue placeholder="Nessun obiettivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nessun obiettivo</SelectItem>
              {objectives.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            {value.objective_id && (
              <Badge variant="outline" className="text-[11px]">
                {objectives.find((o) => o.id === value.objective_id)?.status ?? '—'}
              </Badge>
            )}
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/obiettivi">Gestisci obiettivi</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <CalendarRange className="w-3.5 h-3.5" /> Fase stagionale
          </Label>
          <Select
            value={value.phase_id ?? NONE}
            onValueChange={(v) => onChange({ ...value, phase_id: v === NONE ? null : v })}
          >
            <SelectTrigger><SelectValue placeholder="Nessuna fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nessuna fase</SelectItem>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.plan_name} · {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link to="/programmazione">Programmazione stagionale</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="w-3.5 h-3.5" /> Schemi di allenamento
        </Label>
        {schemes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuno schema disponibile.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {schemes.map((s) => {
              const active = value.scheme_ids.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleScheme(s.id)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                    active
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.name}{s.fundamental ? ` · ${s.fundamental}` : ''}
                </button>
              );
            })}
          </div>
        )}
        {selectedSchemes.length > 0 && (
          <p className="text-xs text-muted-foreground">{selectedSchemes.length} schema/i collegati</p>
        )}
      </div>
    </div>
  );
}
