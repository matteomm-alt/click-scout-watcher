import { Check, X } from 'lucide-react';
import { SKILL_NAMES, EVAL_NAMES, type Phase } from '@/lib/scoutAnalysis';

export interface AnalysisFilters {
  setNumbers: number[];        // [] = tutti
  skills: string[];            // [] = tutte
  evaluations: string[];       // [] = tutte
  playerNumbers: number[];     // [] = tutti (riferiti alla squadra attiva)
  rotations: number[];         // [] = tutte (1..6 = posizione setter squadra attiva)
  phases: Phase[];             // [] = tutte (K1 = ricezione, K2 = battuta) per squadra attiva
}

export const EMPTY_FILTERS: AnalysisFilters = {
  setNumbers: [],
  skills: [],
  evaluations: [],
  playerNumbers: [],
  rotations: [],
  phases: [],
};

export interface PlayerOption {
  number: number;
  name: string;
  role?: string | null;
}

interface Props {
  filters: AnalysisFilters;
  onChange: (f: AnalysisFilters) => void;
  availableSets: number[];
  availableSkills: string[];
  availableRotations: number[];
  players: PlayerOption[];
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

export function MatchFilters({ filters, onChange, availableSets, availableSkills, players }: Props) {
  const activeCount =
    filters.setNumbers.length + filters.skills.length + filters.evaluations.length + filters.playerNumbers.length;

  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Filtri</h3>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
          >
            <X className="w-3 h-3" /> Azzera ({activeCount})
          </button>
        )}
      </div>

      {/* SET */}
      <FilterGroup label="Set">
        {availableSets.map(s => (
          <Chip
            key={s}
            label={`Set ${s}`}
            active={filters.setNumbers.includes(s)}
            onClick={() => onChange({ ...filters, setNumbers: toggle(filters.setNumbers, s) })}
          />
        ))}
      </FilterGroup>

      {/* SKILL */}
      <FilterGroup label="Fondamentale">
        {availableSkills.map(k => (
          <Chip
            key={k}
            label={SKILL_NAMES[k] || k}
            active={filters.skills.includes(k)}
            onClick={() => onChange({ ...filters, skills: toggle(filters.skills, k) })}
          />
        ))}
      </FilterGroup>

      {/* EVALUATION */}
      <FilterGroup label="Valutazione">
        {Object.entries(EVAL_NAMES).map(([k, name]) => (
          <Chip
            key={k}
            label={`${k} ${name}`}
            active={filters.evaluations.includes(k)}
            onClick={() => onChange({ ...filters, evaluations: toggle(filters.evaluations, k) })}
          />
        ))}
      </FilterGroup>

      {/* PLAYER */}
      {players.length > 0 && (
        <FilterGroup label="Atleta">
          {players.map(p => (
            <Chip
              key={p.number}
              label={`#${p.number}${p.name ? ' ' + p.name : ''}`}
              active={filters.playerNumbers.includes(p.number)}
              onClick={() => onChange({ ...filters, playerNumbers: toggle(filters.playerNumbers, p.number) })}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
      }`}
    >
      {active && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}
