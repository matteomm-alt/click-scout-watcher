import { useState, useEffect } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, Evaluation, SkillType } from '@/types/volleyball';
import { useScoutSettings } from '@/lib/scoutSettings';
import { X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* ActionPanel — bottom sheet contestuale: fondamentale + valutazione  */
/* ------------------------------------------------------------------ */

interface ActionPanelProps {
  player: { number: number; team: 'home' | 'away' } | null;
  /** Chiamato dopo aver registrato l'azione. Restituisce l'id e lo skill scelto. */
  onComplete: (actionId: string, skill: Skill) => void;
  onClose: () => void;
}

type SkillDef = { key: Skill; label: string };

const ALL_SKILLS: SkillDef[] = [
  { key: 'S', label: 'S' },
  { key: 'R', label: 'R' },
  { key: 'A', label: 'A' },
  { key: 'B', label: 'B' },
  { key: 'D', label: 'D' },
  { key: 'E', label: 'E' },
];

const SKILL_FULL: Record<Skill, string> = {
  S: 'Battuta', R: 'Ricezione', A: 'Attacco', B: 'Muro', D: 'Difesa', E: 'Alzata', F: 'Freeball',
};

const EVALUATIONS: { key: Evaluation; cls: string }[] = [
  { key: '#', cls: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
  { key: '+', cls: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
  { key: '!', cls: 'bg-secondary text-foreground border-border hover:bg-secondary/80' },
  { key: '-', cls: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200' },
  { key: '/', cls: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' },
  { key: '=', cls: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' },
];

const EVAL_LABEL: Record<Evaluation, string> = {
  '#': 'Perfetto', '+': 'Positivo', '!': 'OK', '-': 'Negativo', '/': 'Murato', '=': 'Errore',
};

export function ActionPanel({ player, onComplete, onClose }: ActionPanelProps) {
  const { homeTeam, awayTeam, matchState, addAction, addPoint } = useMatchStore();
  const { settings } = useScoutSettings();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useEffect(() => { setSelectedSkill(null); }, [player?.number, player?.team]);

  if (!player) return null;

  const teamData = player.team === 'home' ? homeTeam : awayTeam;
  const pData = teamData.players.find((p) => p.number === player.number);
  const playerName = pData?.lastName ?? `#${player.number}`;
  const lineup = player.team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
  const slotIdx = lineup.indexOf(player.number);
  const slotPos = slotIdx >= 0 ? slotIdx + 1 : null;

  const visibleSkills = ALL_SKILLS.filter((s) =>
    (s.key !== 'E' || settings.showAlzata) &&
    (s.key !== 'D' || settings.showDifesa)
  );

  const handleSkill = (skill: Skill) => {
    navigator.vibrate?.(20);
    setSelectedSkill(skill);
  };

  const fire = (skill: Skill, evaluation: Evaluation) => {
    navigator.vibrate?.(25);
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const skillType: SkillType = 'H';
    const teamPrefix = player.team === 'home' ? '*' : 'a';
    const playerStr = String(player.number).padStart(2, '0');
    const code = `${teamPrefix}${playerStr}${skill}${skillType}${evaluation}~~~~~`;

    addAction({
      timestamp: ts,
      team: player.team,
      playerNumber: player.number,
      skill,
      skillType,
      evaluation,
      code,
    });

    // Auto-score (autoPoint)
    if (settings.autoPoint) {
      if ((skill === 'A' || skill === 'S' || skill === 'B') && evaluation === '#') addPoint(player.team);
      else if (evaluation === '=' && (skill === 'S' || skill === 'A')) {
        addPoint(player.team === 'home' ? 'away' : 'home');
      }
    }

    // Recupera l'id dell'azione appena registrata
    const latest = useMatchStore.getState().matchState.actions.slice(-1)[0];
    onComplete(latest?.id ?? '', skill);
  };

  const handleEval = (evaluation: Evaluation) => {
    if (!selectedSkill) return;
    fire(selectedSkill, evaluation);
  };

  const teamLabel = player.team === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');
  const teamDot = player.team === 'home' ? 'bg-[hsl(var(--cs-team-a))]' : 'bg-[hsl(var(--cs-team-b))]';

  return (
    <div className="space-y-4 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-3 h-3 rounded-full ${teamDot}`} />
          <div className="min-w-0">
            <div className="text-lg font-black italic uppercase tracking-wide truncate">
              {teamLabel} <span className="text-primary">#{player.number}</span> {playerName}
            </div>
            <div className="text-xs text-muted-foreground">
              {slotPos ? `Posizione P${slotPos}` : 'In panchina'}
              {pData?.isLibero && ' · Libero'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center active:scale-95"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Fondamentale */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Fondamentale</div>
        <div className="grid grid-cols-6 gap-2">
          {visibleSkills.map((s) => {
            const active = selectedSkill === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSkill(s.key)}
                className={`min-h-[48px] md:min-h-[52px] rounded-xl border-2 font-black text-lg transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                    : 'bg-secondary border-border text-foreground hover:bg-secondary/80'
                }`}
                title={SKILL_FULL[s.key]}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Valutazione */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
          Valutazione {selectedSkill ? `· ${SKILL_FULL[selectedSkill]}` : '(scegli prima il fondamentale)'}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {EVALUATIONS.map((e) => (
            <button
              key={e.key}
              type="button"
              disabled={!selectedSkill}
              onClick={() => handleEval(e.key)}
              className={`min-h-[48px] md:min-h-[52px] rounded-xl border-2 font-black text-xl transition-all active:scale-95 ${e.cls} disabled:opacity-30 disabled:cursor-not-allowed`}
              title={EVAL_LABEL[e.key]}
            >
              {e.key}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground text-center pt-1">
        Tocca prima il fondamentale, poi la valutazione. L&apos;azione viene registrata automaticamente.
      </div>
    </div>
  );
}
