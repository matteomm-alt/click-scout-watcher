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
  /** colore fisso per fondamentale (selezionato/suggerito) */
  color: string;
  /** versione tenue (non selezionato) */
  colorMuted: string;
}[] = [
  { key:'S', label:'S', fullLabel:'Battuta',   advancedOnly:false,
    color:'bg-orange-500 text-white border-orange-500',
    colorMuted:'bg-orange-500/10 text-orange-400 border-orange-500/40 hover:bg-orange-500/20' },
  { key:'R', label:'R', fullLabel:'Ricezione', advancedOnly:false,
    color:'bg-blue-500 text-white border-blue-500',
    colorMuted:'bg-blue-500/10 text-blue-400 border-blue-500/40 hover:bg-blue-500/20' },
  { key:'A', label:'A', fullLabel:'Attacco',   advancedOnly:false,
    color:'bg-red-600 text-white border-red-600',
    colorMuted:'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20' },
  { key:'B', label:'B', fullLabel:'Muro',      advancedOnly:false,
    color:'bg-purple-600 text-white border-purple-600',
    colorMuted:'bg-purple-500/10 text-purple-400 border-purple-500/40 hover:bg-purple-500/20' },
  { key:'E', label:'E', fullLabel:'Alzata',    advancedOnly:true,
    color:'bg-yellow-500 text-yellow-950 border-yellow-500',
    colorMuted:'bg-yellow-500/10 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/20' },
  { key:'D', label:'D', fullLabel:'Difesa',    advancedOnly:true,
    color:'bg-emerald-600 text-white border-emerald-600',
    colorMuted:'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20' },
  { key:'F', label:'F', fullLabel:'Freeball',  advancedOnly:true,
    color:'bg-cyan-600 text-white border-cyan-600',
    colorMuted:'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20' },
];

const SIMPLE_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace', color:'bg-green-600 border-green-700' },
  { key:'+', label:'Positivo',   color:'bg-lime-500 border-lime-600 text-lime-950' },
  { key:'/', label:'Errore',     color:'bg-red-500 border-red-600' },
  { key:'=', label:'Fuori',      color:'bg-red-700 border-red-800' },
];

const ADVANCED_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace',  color:'bg-green-600 border-green-700' },
  { key:'+', label:'Positivo',    color:'bg-lime-500 border-lime-600 text-lime-950' },
  { key:'!', label:'Accettabile', color:'bg-amber-500 border-amber-600 text-amber-950' },
  { key:'-', label:'Negativo',    color:'bg-orange-500 border-orange-600' },
  { key:'/', label:'Errore',      color:'bg-red-500 border-red-600' },
  { key:'=', label:'Fuori',       color:'bg-red-700 border-red-800' },
];

type StepKey = 'player' | 'skill' | 'combo' | 'eval';

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

  const needsCombo = effectiveSkill === 'A' && mode === 'advanced';
  const comboPicked = !needsCombo
    || (isMiddleBlocker ? !!selectedMiddleCombo : !!selectedOtherCombo);

  // Determine active step
  let active: StepKey;
  if (!selectedPlayer) active = 'player';
  else if (!effectiveSkill) active = 'skill';
  else if (needsCombo && !comboPicked) active = 'combo';
  else active = 'eval';

  // Steps shown in the stepper header
  const allSteps: { key: StepKey; n: number; label: string; show: boolean }[] = [
    { key: 'player', n: 1, label: 'Giocatore',    show: true },
    { key: 'skill',  n: 2, label: 'Fondamentale', show: true },
    { key: 'combo',  n: 3, label: 'Tipo/Combo',   show: mode === 'advanced' },
    { key: 'eval',   n: mode === 'advanced' ? 4 : 3, label: 'Valutazione', show: true },
  ];
  const steps = allSteps.filter(s => s.show);

  const teamAccent = selectedPlayer?.team === 'home' ? 'blue' : 'red';
  const teamBorderActive = teamAccent === 'blue'
    ? 'border-blue-500/40 bg-blue-500/10' : 'border-red-500/40 bg-red-500/10';
  const teamText = teamAccent === 'blue' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-full glass rounded-xl overflow-hidden border border-border/50">
      {/* STEPPER HEADER */}
      <div className="px-2 py-2 border-b border-border/40 bg-background/40">
        <div className="flex items-stretch gap-1">
          {steps.map((s, idx) => {
            const done =
              (s.key === 'player' && !!selectedPlayer) ||
              (s.key === 'skill' && !!effectiveSkill) ||
              (s.key === 'combo' && comboPicked && needsCombo) ||
              (s.key === 'eval' && false);
            const isActive = s.key === active;
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
                <div
                  className={cn(
                    'flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all',
                    isActive
                      ? 'bg-[hsl(var(--cs-rail))] text-white border-[hsl(var(--cs-rail))] shadow-md'
                      : done
                        ? 'bg-secondary/40 text-foreground/80 border-border/60'
                        : 'bg-background/50 text-muted-foreground/60 border-border/40',
                  )}
                >
                  <span
                    className={cn(
                      'size-5 flex items-center justify-center rounded-full text-[10px] font-black tabular-nums shrink-0',
                      isActive
                        ? 'bg-white/20 text-white'
                        : done
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-background/60 text-muted-foreground/70',
                    )}
                  >
                    {done && !isActive ? '✓' : s.n}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wider truncate',
                      !isActive && 'hidden sm:inline',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <span className="text-muted-foreground/40 text-[10px]">›</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected player chip — compact */}
        {selectedPlayer && (
          <div className={cn(
            'mt-2 flex items-center gap-2 px-2 py-1 rounded-md border',
            teamBorderActive,
          )}>
            <span className={cn('text-base font-black tabular-nums', teamText)}>
              #{selectedPlayer.number}
            </span>
            <span className="text-xs font-bold truncate flex-1">
              {selectedPlayer.lastName}
            </span>
            {selectedPlayer.role && (
              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                {selectedPlayer.role}
              </span>
            )}
            <span className={cn('text-[9px] font-black uppercase tracking-wider truncate max-w-[80px]', teamText)}>
              {teamName}
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="size-6 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center text-xs"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ACTIVE STEP BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {active === 'player' && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
            <div className="size-12 rounded-full bg-[hsl(var(--cs-rail))] text-white flex items-center justify-center text-xl font-black animate-pulse">
              1
            </div>
            <div className="text-sm font-black uppercase tracking-wider">Tocca una giocatrice</div>
            <div className="text-xs text-muted-foreground max-w-[220px]">
              Seleziona sul campo chi sta eseguendo l'azione.
            </div>
          </div>
        )}

        {active === 'skill' && (
          <>
            <StepTitle n={2} label="Scegli il fondamentale" />
            <div className="grid grid-cols-2 gap-2">
              {visibleSkills.map(s => {
                const isSugg = s.key === suggestedSkill;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onSkillSelect(s.key)}
                    className={cn(
                      'min-h-[56px] flex items-center gap-2 px-3 rounded-xl',
                      'font-black text-sm transition-all active:scale-[0.97]',
                      'border-2',
                      isSugg
                        ? cn(s.color, 'shadow-md ring-2 ring-white/40')
                        : s.colorMuted,
                    )}
                  >
                    <span className={cn(
                      'size-9 flex items-center justify-center rounded-lg font-black text-base',
                      isSugg ? 'bg-black/25' : 'bg-background/60',
                    )}>
                      {s.key}
                    </span>
                    <span className="flex-1 text-left uppercase tracking-wider text-xs">
                      {s.fullLabel}
                    </span>
                    {isSugg && (
                      <span className="text-[9px] uppercase tracking-wider opacity-90">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {active === 'combo' && (
          <>
            <StepTitle n={3} label={isMiddleBlocker ? 'Combo (Centrale)' : 'Tipo e combo'} />

            {!isMiddleBlocker && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1.5">
                  Tipo di attacco
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ATTACK_TYPES.map(t => {
                    const isActive = t.key === selectedAttackType;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => onAttackTypeSelect(t.key)}
                        title={t.description}
                        className={cn(
                          'min-h-[40px] px-3 rounded-md text-xs font-black uppercase tracking-wider transition-all active:scale-95 border-2',
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

            <div>
              <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1.5">
                Combo
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(isMiddleBlocker
                  ? MIDDLE_COMBOS
                  : filterOtherCombosByZone(selectedPlayerZone ?? null)
                ).map(c => {
                  const selected = isMiddleBlocker ? selectedMiddleCombo : selectedOtherCombo;
                  const isActive = c.code === selected;
                  const handler = isMiddleBlocker ? onMiddleComboSelect : onOtherComboSelect;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handler?.(c.code)}
                      title={c.description}
                      className={cn(
                        'min-h-[40px] px-3 rounded-md text-xs font-black uppercase tracking-wider transition-all active:scale-95 border-2',
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

            <div className="mt-3 text-[10px] text-muted-foreground/80 italic px-1">
              Seleziona tipo e combo, poi appare la valutazione.
            </div>
          </>
        )}

        {active === 'eval' && (
          <>
            <StepTitle n={mode === 'advanced' ? 4 : 3} label="Valuta il tocco" />
            <div className="grid grid-cols-2 gap-2">
              {evals.map(e => {
                const isSugg = e.key === suggestedEvaluation;
                return (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => onEvaluationSelect(e.key)}
                    className={cn(
                      'min-h-[60px] flex items-center gap-2.5 px-3 rounded-xl',
                      'font-black text-sm transition-all active:scale-[0.97]',
                      'border-2 text-white shadow-md',
                      e.color,
                      isSugg && 'ring-2 ring-white/60 scale-[1.02]',
                    )}
                  >
                    <span className="size-10 flex items-center justify-center rounded-lg bg-black/30 font-black text-lg">
                      {e.key}
                    </span>
                    <span className="flex-1 text-left uppercase tracking-wider text-xs">
                      {e.label}
                    </span>
                    {isSugg && <span className="text-[9px] uppercase tracking-wider">★</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* FOOTER: status + back */}
      <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
        <span className="font-black text-muted-foreground">
          {mode === 'simple' ? '⚡ Simple' : '📊 Advanced'}
        </span>
        <div className="flex items-center gap-2">
          {effectiveSkill && active !== 'player' && (
            <button
              type="button"
              onClick={() => onSkillSelect(null)}
              className="px-2 py-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors font-bold"
            >
              ← cambia
            </button>
          )}
          <span className="text-muted-foreground/70 font-bold">
            {active === 'player' ? 'Step 1 di ' + steps.length
              : active === 'skill' ? `Step 2 di ${steps.length}`
              : active === 'combo' ? `Step 3 di ${steps.length}`
              : `Step ${steps.length} di ${steps.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="size-7 flex items-center justify-center rounded-full bg-[hsl(var(--cs-rail))] text-white text-xs font-black tabular-nums">
        {n}
      </span>
      <span className="text-sm font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}
