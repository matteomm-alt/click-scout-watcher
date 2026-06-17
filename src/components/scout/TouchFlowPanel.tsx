import type { Skill, Evaluation } from '@/types/volleyball';
import { cn } from '@/lib/utils';

export type ScoutingMode = 'simple' | 'advanced';

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
  onSkillSelect: (skill: Skill | null) => void;
  onEvaluationSelect: (evaluation: Evaluation) => void;
  onCancel: () => void;
}

const SKILLS_CFG: {
  key: Skill; label: string; fullLabel: string;
  color: string; advancedOnly: boolean;
}[] = [
  { key:'S', label:'S', fullLabel:'Battuta',   color:'bg-yellow-600', advancedOnly:false },
  { key:'R', label:'R', fullLabel:'Ricezione',  color:'bg-blue-600',   advancedOnly:false },
  { key:'A', label:'A', fullLabel:'Attacco',    color:'bg-red-600',    advancedOnly:false },
  { key:'B', label:'B', fullLabel:'Muro',       color:'bg-purple-600', advancedOnly:false },
  { key:'E', label:'E', fullLabel:'Alzata',     color:'bg-green-600',  advancedOnly:true  },
  { key:'D', label:'D', fullLabel:'Difesa',     color:'bg-teal-600',   advancedOnly:true  },
  { key:'F', label:'F', fullLabel:'Freeball',   color:'bg-slate-500',  advancedOnly:true  },
];

const SIMPLE_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace',  color:'bg-green-500' },
  { key:'+', label:'Positivo',    color:'bg-lime-500'  },
  { key:'/', label:'Errore',      color:'bg-red-500'   },
  { key:'=', label:'Fuori',       color:'bg-gray-500'  },
];

const ADVANCED_EVALS: { key: Evaluation; label: string; color: string }[] = [
  { key:'#', label:'Kill / Ace',    color:'bg-green-500'  },
  { key:'+', label:'Positivo',      color:'bg-lime-500'   },
  { key:'!', label:'Accettabile',   color:'bg-yellow-500' },
  { key:'-', label:'Negativo',      color:'bg-orange-500' },
  { key:'/', label:'Errore',        color:'bg-red-500'    },
  { key:'=', label:'Fuori',         color:'bg-gray-500'   },
];

export function TouchFlowPanel({
  selectedPlayer, selectedSkill, mode, suggestedSkill, suggestedEvaluation,
  teamName, onSkillSelect, onEvaluationSelect, onCancel,
}: TouchFlowPanelProps) {
  const visibleSkills = SKILLS_CFG.filter(s =>
    mode === 'simple' ? !s.advancedOnly : true
  );
  const evals = mode === 'simple' ? SIMPLE_EVALS : ADVANCED_EVALS;

  const effectiveSkill: Skill | null =
    selectedSkill ??
    (mode === 'simple' && suggestedSkill ? suggestedSkill : null);

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
                    isSugg
                      ? `${s.color} text-white shadow-md`
                      : 'bg-secondary/50 hover:bg-secondary/80',
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
                    <span className={cn('size-7 flex items-center justify-center rounded-lg text-white font-black text-sm', sk.color)}>
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

            <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-1">
              Valutazione
            </div>
            {evals.map(e => (
              <button
                key={e.key}
                type="button"
                onClick={() => onEvaluationSelect(e.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 rounded-xl',
                  'font-bold text-sm transition-all active:scale-[0.97]',
                  'bg-secondary/50 hover:bg-secondary/80',
                  padY,
                )}
              >
                <span className={cn('size-8 flex items-center justify-center rounded-lg text-white font-black', e.color)}>
                  {e.key}
                </span>
                <span className="flex-1 text-left">{e.label}</span>
              </button>
            ))}
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
