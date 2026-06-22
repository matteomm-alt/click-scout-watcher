import type { Skill, Evaluation, AttackType } from '@/types/volleyball';
import { ATTACK_TYPES, ATTACK_COMBOS } from '@/types/volleyball';
import { cn } from '@/lib/utils';

export type ScoutingMode = 'simple' | 'advanced';

interface LiveFooterProps {
  selectedPlayer: { number: number; team: 'home' | 'away' } | null;
  selectedSkill: Skill | null;
  mode: ScoutingMode;
  suggestedSkill?: Skill | null;
  selectedAttackType: AttackType;
  onAttackTypeSelect: (type: AttackType) => void;
  isMiddleBlocker?: boolean;
  selectedMiddleCombo?: string | null;
  onMiddleComboSelect?: (code: string) => void;
  selectedOtherCombo?: string | null;
  onOtherComboSelect?: (code: string) => void;
  selectedPlayerZone?: number | null;
  onSkillSelect: (skill: Skill) => void;
  onEvaluationSelect: (evaluation: Evaluation) => void;
}

const SKILLS_ORDER: { key: Skill; label: string; advancedOnly: boolean }[] = [
  { key: 'S', label: 'Battuta',   advancedOnly: false },
  { key: 'R', label: 'Ricezione', advancedOnly: false },
  { key: 'A', label: 'Attacco',   advancedOnly: false },
  { key: 'B', label: 'Muro',      advancedOnly: false },
  { key: 'E', label: 'Alzata',    advancedOnly: true  },
  { key: 'D', label: 'Difesa',    advancedOnly: true  },
  { key: 'F', label: 'Freeball',  advancedOnly: true  },
];

const SIMPLE_EVALS: { key: Evaluation; label: string }[] = [
  { key: '#', label: 'Kill' },
  { key: '+', label: 'Pos' },
  { key: '/', label: 'Err' },
  { key: '=', label: 'Fuori' },
];

const ADVANCED_EVALS: { key: Evaluation; label: string }[] = [
  { key: '#', label: 'Kill' },
  { key: '+', label: 'Pos' },
  { key: '!', label: 'OK' },
  { key: '-', label: 'Neg' },
  { key: '/', label: 'Err' },
  { key: '=', label: 'Fuori' },
];

const MIDDLE_COMBOS = ATTACK_COMBOS.filter((c) => c.position === 'C');
const ALL_OTHER_COMBOS = ATTACK_COMBOS.filter((c) => c.position !== 'C');
function filterOtherCombosByZone(zone: number | null): typeof ALL_OTHER_COMBOS {
  if (zone == null) return ALL_OTHER_COMBOS;
  return ALL_OTHER_COMBOS.filter((c) => !c.zones || c.zones.includes(zone));
}

/**
 * Footer fissa skill+evaluation, sempre visibile (anche senza giocatore selezionato),
 * fedele allo schema di OpenVolleyScout: due righe separate, bottoni inattivi neutri,
 * bottone attivo pieno con colore solido, nessun colore distintivo per tipo di skill.
 */
export function LiveFooter({
  selectedPlayer, selectedSkill, mode, suggestedSkill,
  selectedAttackType, onAttackTypeSelect,
  isMiddleBlocker, selectedMiddleCombo, onMiddleComboSelect,
  selectedOtherCombo, onOtherComboSelect, selectedPlayerZone,
  onSkillSelect, onEvaluationSelect,
}: LiveFooterProps) {
  const visibleSkills = SKILLS_ORDER.filter(s => mode === 'simple' ? !s.advancedOnly : true);
  const evals = mode === 'simple' ? SIMPLE_EVALS : ADVANCED_EVALS;
  const noPlayer = !selectedPlayer;
  const showAttackType = selectedSkill === 'A' && mode === 'advanced' && !isMiddleBlocker;
  const showMiddleCombo = selectedSkill === 'A' && mode === 'advanced' && !!isMiddleBlocker;
  const showOtherCombos = selectedSkill === 'A' && mode === 'advanced' && !isMiddleBlocker;

  return (
    <div className="shrink-0 border-t border-border bg-card/50 px-2 py-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14 shrink-0">
          {selectedPlayer ? `#${selectedPlayer.number}` : 'Fondam.'}
        </span>
        <div className="flex-1 flex gap-1 flex-wrap">
          {visibleSkills.map(s => {
            const isActive = s.key === selectedSkill;
            const isSugg = !isActive && s.key === suggestedSkill;
            return (
              <button
                key={s.key}
                type="button"
                disabled={noPlayer}
                onClick={() => onSkillSelect(s.key)}
                className={cn(
                  'min-h-[34px] px-3 rounded-md text-xs font-bold transition-all active:scale-95',
                  'border',
                  isActive
                    ? 'bg-[hsl(var(--cs-rail))] text-white border-[hsl(var(--cs-rail))]'
                    : 'bg-background text-muted-foreground border-border hover:bg-secondary/60',
                  isSugg && 'ring-1 ring-primary',
                  noPlayer && 'opacity-40 cursor-not-allowed',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {showAttackType && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14 shrink-0">
            Tipo
          </span>
          <div className="flex-1 flex gap-1 flex-wrap">
            {ATTACK_TYPES.map(t => {
              const isActive = t.key === selectedAttackType;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onAttackTypeSelect(t.key)}
                  title={t.description}
                  className={cn(
                    'min-h-[30px] px-2.5 rounded-md text-xs font-bold transition-all active:scale-95 border',
                    isActive
                      ? 'bg-[hsl(var(--cs-rail))] text-white border-[hsl(var(--cs-rail))]'
                      : 'bg-background text-muted-foreground border-border hover:bg-secondary/60',
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showMiddleCombo && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14 shrink-0">
            Combo
          </span>
          <div className="flex-1 flex gap-1 flex-wrap">
            {MIDDLE_COMBOS.map(c => {
              const isActive = c.code === selectedMiddleCombo;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onMiddleComboSelect?.(c.code)}
                  title={c.description}
                  className={cn(
                    'min-h-[30px] px-2.5 rounded-md text-xs font-bold transition-all active:scale-95 border',
                    isActive
                      ? 'bg-[hsl(var(--cs-rail))] text-white border-[hsl(var(--cs-rail))]'
                      : 'bg-background text-muted-foreground border-border hover:bg-secondary/60',
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showOtherCombos && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14 shrink-0">
            Combo
          </span>
          <div className="flex-1 flex gap-1 flex-wrap">
            {OTHER_COMBOS.map(c => {
              const isActive = c.code === selectedOtherCombo;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onOtherComboSelect?.(c.code)}
                  title={c.description}
                  className={cn(
                    'min-h-[30px] px-2.5 rounded-md text-xs font-bold transition-all active:scale-95 border',
                    isActive
                      ? 'bg-[hsl(var(--cs-rail))] text-white border-[hsl(var(--cs-rail))]'
                      : 'bg-background text-muted-foreground border-border hover:bg-secondary/60',
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-14 shrink-0">
          Eval.
        </span>
        <div className="flex-1 flex gap-1 flex-wrap">
          {evals.map(e => {
            const disabled = !selectedSkill;
            const evalColors: Record<string, string> = {
              '#': 'bg-green-600 text-white border-green-700',
              '+': 'bg-lime-500 text-lime-950 border-lime-600',
              '!': 'bg-amber-500 text-amber-950 border-amber-600',
              '-': 'bg-orange-500 text-white border-orange-600',
              '/': 'bg-red-500 text-white border-red-600',
              '=': 'bg-red-700 text-white border-red-800',
            };
            return (
              <button
                key={e.key}
                type="button"
                disabled={disabled}
                onClick={() => onEvaluationSelect(e.key)}
                className={cn(
                  'min-h-[34px] min-w-[34px] px-2 rounded-md text-sm font-black transition-all active:scale-95',
                  'border hover:brightness-110',
                  evalColors[e.key],
                  disabled && 'opacity-30 cursor-not-allowed',
                )}
                title={e.label}
              >
                {e.key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
