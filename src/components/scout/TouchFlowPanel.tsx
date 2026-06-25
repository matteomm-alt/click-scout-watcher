import type { Skill, Evaluation, AttackType } from '@/types/volleyball';
import { ATTACK_TYPES, ATTACK_COMBOS } from '@/types/volleyball';
import { cn } from '@/lib/utils';

export type ScoutingMode = 'simple' | 'advanced';

const MIDDLE_COMBOS = ATTACK_COMBOS.filter((c) => c.position === 'C');
const ALL_OTHER_COMBOS = ATTACK_COMBOS.filter((c) => c.position !== 'C');
function filterOtherCombosByZone(zone: number | null): typeof ALL_OTHER_COMBOS {
  if (zone == null) return ALL_OTHER_COMBOS;
  return ALL_OTHER_COMBOS.filter((c) => !c.zones || c.zones.includes(zone));
}

interface TouchFlowPanelProps {
  selectedPlayer: {
    number: number;
    lastName: string;
    role?: string;
    team: 'home' | 'away';
  } | null;
  selectedSkill: Skill | null;
  mode: ScoutingMode;
  suggestedSkill?: Skill | null;
  suggestedEvaluation?: Evaluation | null;
  teamName: string;
  selectedAttackType: AttackType;
  onAttackTypeSelect: (type: AttackType) => void;
  isMiddleBlocker?: boolean;
  selectedMiddleCombo?: string | null;
  onMiddleComboSelect?: (code: string) => void;
  selectedOtherCombo?: string | null;
  onOtherComboSelect?: (code: string) => void;
  selectedPlayerZone?: number | null;
  onSkillSelect: (skill: Skill | null) => void;
  onEvaluationSelect: (evaluation: Evaluation) => void;
  onCancel: () => void;
}

const SKILLS_CFG: {
  key: Skill; label: string; fullLabel: string;
  advancedOnly: boolean;
}[] = [
  { key:'S', label:'S', fullLabel:'Battuta',   advancedOnly:false },
  { key:'R', label:'R', fullLabel:'Ricezione',  advancedOnly:false },
  { key:'A', label:'A', fullLabel:'Attacco',    advancedOnly:false },
  { key:'B', label:'B', fullLabel:'Muro',       advancedOnly:false },
  { key:'E', label:'E', fullLabel:'Alzata',     advancedOnly:true  },
  { key:'D', label:'D', fullLabel:'Difesa',     advancedOnly:true  },
  { key:'F', label:'F', fullLabel:'Freeball',   advancedOnly:true  },
];

const SIMPLE_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace',  color:'bg-green-600' },
  { key:'+', label:'Positivo',    color:'bg-lime-500'  },
  { key:'/', label:'Errore',      color:'bg-red-500'   },
  { key:'=', label:'Fuori',       color:'bg-red-700'   },
];

const ADVANCED_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace',    color:'bg-green-600' },
  { key:'+', label:'Positivo',      color:'bg-lime-500'  },
  { key:'!', label:'Accettabile',   color:'bg-amber-500' },
  { key:'-', label:'Negativo',      color:'bg-orange-500'},
  { key:'/', label:'Errore',        color:'bg-red-500'   },
  { key:'=', label:'Fuori',         color:'bg-red-700'   },
];

export function TouchFlowPanel({
  selectedPlayer, selectedSkill, mode, suggestedSkill, suggestedEvaluation,
  teamName, selectedAttackType, onAttackTypeSelect,
  isMiddleBlocker, selectedMiddleCombo, onMiddleComboSelect,
  selectedOtherCombo, onOtherComboSelect, selectedPlayerZone,
  onSkillSelect, onEvaluationSelect, onCancel,
}: TouchFlowPanelProps) {
  const visibleSkills = SKILLS_CFG.filter(s =>
    mode === 'simple' ? !s.advancedOnly : true
  );
  const evals = mode === 'simple' ? SIMPLE_EVALS : ADVANCED_EVALS;

  const effectiveSkill: Skill | null =
    selectedSkill ??
    (mode === 'simple' && suggestedSkill ? suggestedSkill : null);

  const showAttackType = effectiveSkill === 'A' && mode === 'advanced' && !isMiddleBlocker;
  const showMiddleCombo = effectiveSkill === 'A' && mode === 'advanced' && !!isMiddleBlocker;
  const showOtherCombos = effectiveSkill === 'A' && mode === 'advanced' && !isMiddleBlocker;

  const teamBorder = selectedPlayer?.team === 'home'
    ? 'border-blue-500/30 bg-blue-500/10'
    : 'border-red-500/30 bg-red-500/10';
  const teamText = selectedPlayer?.team === 'home'
    ? 'text-blue-400' : 'text-red-400';

  const padY = mode === 'simple' ? 'py-3.5' : 'py-2.5';

  return (
    <div className="flex flex-col h-full glass rounded-xl overflow-hidden border border-border/50">
      {/* Header */}
      <div className={cn('px-3 py-2.5 border-b border-border/40 flex items-center gap-3', teamBorder)}>
        {selectedPlayer ? (
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-xl font-black tabular-nums', teamText)}>
                  #{selectedPlayer.number}
                </span>
                <span className="text-sm font-bold truncate">
                  {selectedPlayer.lastName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedPlayer.role && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    {selectedPlayer.role}
                  </span>
                )}
                <span className={cn('text-[10px] font-black uppercase tracking-wider', teamText)}>
                  {teamName}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="size-8 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="flex-1 text-center text-xs text-muted-foreground py-2">
            Tocca una giocatrice sul campo
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {!effectiveSkill && (
          <>
            <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
              Fondamentale
            </div>
            {visibleSkills.map(s => {
              const isSugg = s.key === suggestedSkill;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onSkillSelect(s.key)}
                  disabled={!selectedPlayer}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 rounded-xl',
                    'font-bold text-sm transition-all active:scale-[0.97]',
                    'disabled:opacity-20 disabled:cursor-not-allowed',
                    padY,
                    'bg-secondary/50 hover:bg-secondary/80',
                    isSugg && 'ring-2 ring-primary',
                  )}
                >
                  <span className="size-8 flex items-center justify-center rounded-lg bg-black/20 font-black">
                    {s.key}
                  </span>
                  <span className="flex-1 text-left">{s.fullLabel}</span>
                  {isSugg && (
                    <span className="text-[10px] uppercase tracking-wider opacity-90">
                      → suggerito
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {effectiveSkill && (
          <>
            <div className="flex items-center gap-2 mb-1">
              {(() => {
                const sk = SKILLS_CFG.find(s => s.key === effectiveSkill);
                if (!sk) return null;
                return (
                  <>
                    <span className="size-7 flex items-center justify-center rounded-lg bg-secondary text-foreground font-black text-sm border border-border">
                      {sk.key}
                    </span>
                    <span className="text-sm font-bold">{sk.fullLabel}</span>
                    {mode === 'simple' && !selectedSkill && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        inferita
                      </span>
                    )}
                    {mode === 'advanced' && (
                      <button
                        type="button"
                        onClick={() => onSkillSelect(null)}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/60 transition-colors"
                      >
                        ← cambia
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {showAttackType && (
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
                  Tipo
                </div>
                <div className="flex flex-wrap gap-1">
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
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
                  Combo
                </div>
                <div className="flex flex-wrap gap-1">
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
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
                  Combo
                </div>
                <div className="flex flex-wrap gap-1">
                  {filterOtherCombosByZone(selectedPlayerZone ?? null).map(c => {
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

            <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
              Valutazione
            </div>
            {evals.map(e => {
              const isSuggEval = e.key === suggestedEvaluation;
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => onEvaluationSelect(e.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 rounded-xl',
                    'font-bold text-sm transition-all active:scale-[0.97]',
                    padY,
                    isSuggEval
                      ? `${e.color} text-white shadow-md ring-2 ring-white/40`
                      : 'bg-secondary/50 hover:bg-secondary/80',
                  )}
                >
                  <span className={cn('size-8 flex items-center justify-center rounded-lg text-white font-black', e.color)}>
                    {e.key}
                  </span>
                  <span className="flex-1 text-left">{e.label}</span>
                  {isSuggEval && (
                    <span className="text-[10px] uppercase tracking-wider opacity-90">
                      → suggerito
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="font-black text-muted-foreground">
          {mode === 'simple' ? '⚡ Simple' : '📊 Advanced'}
        </span>
        <span className="text-muted-foreground/70">
          {!selectedPlayer ? 'Tocca campo'
            : !effectiveSkill ? 'Scegli fondamentale'
            : 'Scegli valutazione'}
        </span>
      </div>
    </div>
  );
}
