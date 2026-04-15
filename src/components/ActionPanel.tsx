import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, Evaluation, SkillType } from '@/types/volleyball';
import { SKILL_LABELS, EVALUATION_LABELS } from '@/types/volleyball';
import { Undo2, Download, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { generateDVW } from '@/lib/dvwExporter';

type ScoutStep = 'team' | 'player' | 'skill' | 'evaluation';

export function ActionPanel() {
  const {
    homeTeam, awayTeam, matchState,
    addAction, addPoint, undoLastAction,
    rotateTeam, substitutePlayer, endSet,
    matchInfo, homeLineup, awayLineup,
  } = useMatchStore();

  const [step, setStep] = useState<ScoutStep>('team');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [subTeam, setSubTeam] = useState<'home' | 'away'>('home');
  const [subOut, setSubOut] = useState<number | null>(null);

  const skills: { key: Skill; color: string }[] = [
    { key: 'S', color: 'bg-blue-600 hover:bg-blue-500' },
    { key: 'R', color: 'bg-emerald-600 hover:bg-emerald-500' },
    { key: 'A', color: 'bg-red-600 hover:bg-red-500' },
    { key: 'B', color: 'bg-purple-600 hover:bg-purple-500' },
    { key: 'D', color: 'bg-amber-600 hover:bg-amber-500' },
    { key: 'E', color: 'bg-teal-600 hover:bg-teal-500' },
    { key: 'F', color: 'bg-gray-600 hover:bg-gray-500' },
  ];

  const evaluations: { key: Evaluation; color: string; label: string }[] = [
    { key: '#', color: 'bg-green-600 hover:bg-green-500', label: '# Perfetto' },
    { key: '+', color: 'bg-emerald-600 hover:bg-emerald-500', label: '+ Positivo' },
    { key: '!', color: 'bg-yellow-600 hover:bg-yellow-500', label: '! OK' },
    { key: '-', color: 'bg-orange-600 hover:bg-orange-500', label: '- Negativo' },
    { key: '/', color: 'bg-red-500 hover:bg-red-400', label: '/ Scarso' },
    { key: '=', color: 'bg-red-700 hover:bg-red-600', label: '= Errore' },
  ];

  const resetSelection = () => {
    setStep('team');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSelectedSkill(null);
  };

  const getTeamLineup = (team: 'home' | 'away') => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const teamData = team === 'home' ? homeTeam : awayTeam;
    return lineup.map(num => {
      const player = teamData.players.find(p => p.number === num);
      return { number: num, name: player?.lastName || `#${num}` };
    });
  };

  const handleTeamSelect = (team: 'home' | 'away') => {
    setSelectedTeam(team);
    setStep('player');
  };

  const handlePlayerSelect = (num: number) => {
    setSelectedPlayer(num);
    setStep('skill');
  };

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkill(skill);
    setStep('evaluation');
  };

  const handleEvaluation = (evaluation: Evaluation) => {
    if (!selectedTeam || selectedPlayer === null || !selectedSkill) return;

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;

    const skillType: SkillType = 'H'; // Default to High

    const teamPrefix = selectedTeam === 'home' ? '*' : 'a';
    const playerStr = String(selectedPlayer).padStart(2, '0');
    const code = `${teamPrefix}${playerStr}${selectedSkill}${skillType}${evaluation}~~~`;

    addAction({
      timestamp,
      team: selectedTeam,
      playerNumber: selectedPlayer,
      skill: selectedSkill,
      skillType,
      evaluation,
      code,
    });

    // Auto-score for kills/errors
    if (selectedSkill === 'A' && evaluation === '#') {
      addPoint(selectedTeam);
    } else if (selectedSkill === 'S' && evaluation === '#') {
      addPoint(selectedTeam);
    } else if (selectedSkill === 'B' && evaluation === '#') {
      addPoint(selectedTeam);
    } else if (evaluation === '=') {
      addPoint(selectedTeam === 'home' ? 'away' : 'home');
    }

    resetSelection();
  };

  const handleExportDVW = () => {
    const dvw = generateDVW(
      matchInfo, homeTeam, awayTeam,
      homeLineup, awayLineup,
      matchState.actions,
      matchState.setResults,
      matchState.homeSetsWon,
      matchState.awaySetsWon
    );
    const blob = new Blob([dvw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${homeTeam.code}_${awayTeam.code}_${matchInfo.date}.dvw`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubstitution = (inNumber: number) => {
    if (subOut !== null) {
      substitutePlayer(subTeam, subOut, inNumber);
      setShowSubstitution(false);
      setSubOut(null);
    }
  };

  // Substitution UI
  if (showSubstitution) {
    const lineup = getTeamLineup(subTeam);
    const teamData = subTeam === 'home' ? homeTeam : awayTeam;
    const lineupNumbers = subTeam === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const bench = teamData.players.filter(p => !lineupNumbers.includes(p.number) && !p.isLibero);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Sostituzione</h3>
          <button onClick={() => { setShowSubstitution(false); setSubOut(null); }} className="text-xs text-muted-foreground hover:text-foreground">
            Annulla
          </button>
        </div>

        {!subOut ? (
          <>
            <p className="text-xs text-muted-foreground">Chi esce?</p>
            <div className="flex gap-2 flex-wrap">
              {['home', 'away'].map(t => (
                <button
                  key={t}
                  onClick={() => setSubTeam(t as 'home' | 'away')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    subTeam === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {t === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {lineup.map(p => (
                <button
                  key={p.number}
                  onClick={() => setSubOut(p.number)}
                  className="p-2 rounded-lg bg-secondary hover:bg-destructive/20 text-foreground text-sm font-semibold"
                >
                  {p.number} {p.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Chi entra al posto di #{subOut}?</p>
            <div className="grid grid-cols-3 gap-2">
              {bench.map(p => (
                <button
                  key={p.number}
                  onClick={() => handleSubstitution(p.number)}
                  className="p-2 rounded-lg bg-secondary hover:bg-accent/20 text-foreground text-sm font-semibold"
                >
                  {p.number} {p.lastName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current selection breadcrumb */}
      {step !== 'team' && (
        <div className="flex items-center gap-2 text-xs">
          <button onClick={resetSelection} className="text-muted-foreground hover:text-foreground">
            Reset
          </button>
          {selectedTeam && (
            <span className="text-primary font-semibold">
              {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}
            </span>
          )}
          {selectedPlayer !== null && (
            <span className="text-foreground">→ #{selectedPlayer}</span>
          )}
          {selectedSkill && (
            <span className="text-foreground">→ {SKILL_LABELS[selectedSkill]}</span>
          )}
        </div>
      )}

      {/* Step: Team */}
      {step === 'team' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTeamSelect('home')}
            className="p-4 rounded-xl bg-blue-900/30 border border-blue-700/30 hover:bg-blue-800/40 text-foreground font-bold text-lg transition-all touch-target"
          >
            {homeTeam.name || 'Casa'}
          </button>
          <button
            onClick={() => handleTeamSelect('away')}
            className="p-4 rounded-xl bg-red-900/30 border border-red-700/30 hover:bg-red-800/40 text-foreground font-bold text-lg transition-all touch-target"
          >
            {awayTeam.name || 'Ospite'}
          </button>
        </div>
      )}

      {/* Step: Player */}
      {step === 'player' && selectedTeam && (
        <div className="grid grid-cols-3 gap-2">
          {getTeamLineup(selectedTeam).map((p, i) => (
            <button
              key={p.number}
              onClick={() => handlePlayerSelect(p.number)}
              className="p-3 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/50 text-foreground transition-all touch-target"
            >
              <div className="text-2xl font-black text-primary">{p.number}</div>
              <div className="text-xs truncate text-muted-foreground">{p.name}</div>
              <div className="text-[10px] text-muted-foreground/50">P{i + 1}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Skill */}
      {step === 'skill' && (
        <div className="grid grid-cols-4 gap-2">
          {skills.map(s => (
            <button
              key={s.key}
              onClick={() => handleSkillSelect(s.key)}
              className={`p-3 rounded-xl ${s.color} text-white font-bold transition-all touch-target`}
            >
              <div className="text-xl">{s.key}</div>
              <div className="text-[10px]">{SKILL_LABELS[s.key]}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Evaluation */}
      {step === 'evaluation' && (
        <div className="grid grid-cols-3 gap-2">
          {evaluations.map(e => (
            <button
              key={e.key}
              onClick={() => handleEvaluation(e.key)}
              className={`p-4 rounded-xl ${e.color} text-white font-bold text-lg transition-all touch-target`}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
        <button
          onClick={undoLastAction}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium"
          disabled={matchState.actions.length === 0}
        >
          <Undo2 className="w-3.5 h-3.5" /> Annulla
        </button>
        <button
          onClick={() => addPoint('home')}
          className="px-3 py-2 rounded-lg bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 text-xs font-semibold"
        >
          +1 {homeTeam.name || 'Casa'}
        </button>
        <button
          onClick={() => addPoint('away')}
          className="px-3 py-2 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-800/40 text-xs font-semibold"
        >
          +1 {awayTeam.name || 'Ospite'}
        </button>
        <button
          onClick={() => setShowSubstitution(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Cambio
        </button>
        <button
          onClick={endSet}
          className="px-3 py-2 rounded-lg bg-secondary text-warning hover:bg-warning/10 text-xs font-semibold"
        >
          Fine Set
        </button>
        <button
          onClick={handleExportDVW}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold ml-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export DVW
        </button>
      </div>
    </div>
  );
}
