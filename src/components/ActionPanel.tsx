import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, Evaluation, SkillType } from '@/types/volleyball';
import { SKILL_LABELS } from '@/types/volleyball';
import { Undo2, Download, ArrowLeftRight, SkipForward } from 'lucide-react';
import { generateDVW } from '@/lib/dvwExporter';
import { ZoneCourt } from '@/components/VolleyballCourt';

type ScoutStep = 'team' | 'player' | 'skill' | 'evaluation' | 'startZone' | 'endZone';

// Skills that use trajectories (start + end zone)
const TRAJECTORY_SKILLS: Skill[] = ['S', 'R', 'A', 'D'];

export function ActionPanel() {
  const {
    homeTeam, awayTeam, matchState,
    addAction, addPoint, undoLastAction,
    substitutePlayer, endSet,
    matchInfo, homeLineup, awayLineup,
  } = useMatchStore();

  const [step, setStep] = useState<ScoutStep>('team');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [startZone, setStartZone] = useState<number | null>(null);
  const [endZone, setEndZone] = useState<number | null>(null);
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
    setSelectedEvaluation(null);
    setStartZone(null);
    setEndZone(null);
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

  const handleEvaluationSelect = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    // If skill supports trajectories, ask for zones
    if (selectedSkill && TRAJECTORY_SKILLS.includes(selectedSkill)) {
      setStep('startZone');
    } else {
      // Finalize without zones
      finalizeAction(evaluation, null, null);
    }
  };

  const handleStartZone = (zone: number) => {
    setStartZone(zone);
    setStep('endZone');
  };

  const handleEndZone = (zone: number) => {
    setEndZone(zone);
    if (selectedEvaluation) {
      finalizeAction(selectedEvaluation, startZone, zone);
    }
  };

  const skipZones = () => {
    if (selectedEvaluation) {
      finalizeAction(selectedEvaluation, startZone, endZone);
    }
  };

  const finalizeAction = (evaluation: Evaluation, szOne: number | null, ezOne: number | null) => {
    if (!selectedTeam || selectedPlayer === null || !selectedSkill) return;

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;

    const skillType: SkillType = 'H';
    const teamPrefix = selectedTeam === 'home' ? '*' : 'a';
    const playerStr = String(selectedPlayer).padStart(2, '0');
    const szStr = szOne ? String(szOne) : '~';
    const ezStr = ezOne ? String(ezOne) : '~';
    const code = `${teamPrefix}${playerStr}${selectedSkill}${skillType}${evaluation}~~~${szStr}${ezStr}`;

    addAction({
      timestamp,
      team: selectedTeam,
      playerNumber: selectedPlayer,
      skill: selectedSkill,
      skillType,
      evaluation,
      startZone: szOne ?? undefined,
      endZone: ezOne ?? undefined,
      code,
    });

    // Auto-score
    if ((selectedSkill === 'A' || selectedSkill === 'S' || selectedSkill === 'B') && evaluation === '#') {
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
              {(['home', 'away'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSubTeam(t)}
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
                <button key={p.number} onClick={() => setSubOut(p.number)}
                  className="p-2 rounded-lg bg-secondary hover:bg-destructive/20 text-foreground text-sm font-semibold">
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
                <button key={p.number} onClick={() => handleSubstitution(p.number)}
                  className="p-2 rounded-lg bg-secondary hover:bg-accent/20 text-foreground text-sm font-semibold">
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
      {/* Breadcrumb */}
      {step !== 'team' && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button onClick={resetSelection} className="text-destructive hover:text-destructive/80 font-semibold">✕ Reset</button>
          {selectedTeam && (
            <span className="px-2 py-0.5 rounded bg-secondary text-primary font-semibold">
              {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}
            </span>
          )}
          {selectedPlayer !== null && (
            <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-semibold">#{selectedPlayer}</span>
          )}
          {selectedSkill && (
            <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-semibold">{SKILL_LABELS[selectedSkill]}</span>
          )}
          {selectedEvaluation && (
            <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-bold">{selectedEvaluation}</span>
          )}
          {startZone && (
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold">Z{startZone}→</span>
          )}
        </div>
      )}

      {/* Step: Team */}
      {step === 'team' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleTeamSelect('home')}
            className="p-4 rounded-xl bg-secondary border-2 border-blue-700/30 hover:border-blue-500/60 text-foreground font-bold text-lg transition-all touch-target">
            {homeTeam.name || 'Casa'}
          </button>
          <button onClick={() => handleTeamSelect('away')}
            className="p-4 rounded-xl bg-secondary border-2 border-red-700/30 hover:border-red-500/60 text-foreground font-bold text-lg transition-all touch-target">
            {awayTeam.name || 'Ospite'}
          </button>
        </div>
      )}

      {/* Step: Player */}
      {step === 'player' && selectedTeam && (
        <div className="grid grid-cols-3 gap-2">
          {getTeamLineup(selectedTeam).map((p, i) => (
            <button key={p.number} onClick={() => handlePlayerSelect(p.number)}
              className="p-3 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/50 text-foreground transition-all touch-target">
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
            <button key={s.key} onClick={() => handleSkillSelect(s.key)}
              className={`p-3 rounded-xl ${s.color} text-primary-foreground font-bold transition-all touch-target`}>
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
            <button key={e.key} onClick={() => handleEvaluationSelect(e.key)}
              className={`p-3 rounded-xl ${e.color} text-primary-foreground font-bold text-base transition-all touch-target`}>
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Step: Start Zone */}
      {step === 'startZone' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Zona di partenza</span>
            <button onClick={skipZones} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <SkipForward className="w-3 h-3" /> Salta
            </button>
          </div>
          <ZoneCourt
            mode="select-start"
            onZoneClick={handleStartZone}
            highlightedZone={null}
            side={selectedTeam || 'home'}
          />
        </div>
      )}

      {/* Step: End Zone */}
      {step === 'endZone' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Zona di arrivo</span>
            <button onClick={skipZones} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <SkipForward className="w-3 h-3" /> Salta
            </button>
          </div>
          <ZoneCourt
            mode="select-end"
            onZoneClick={handleEndZone}
            startZone={startZone}
            side={selectedTeam || 'home'}
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
        <button onClick={undoLastAction} disabled={matchState.actions.length === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium disabled:opacity-30">
          <Undo2 className="w-3.5 h-3.5" /> Annulla
        </button>
        <button onClick={() => addPoint('home')}
          className="px-3 py-2 rounded-lg bg-secondary border border-blue-700/20 text-foreground hover:border-blue-500/40 text-xs font-semibold">
          +1 {homeTeam.name || 'Casa'}
        </button>
        <button onClick={() => addPoint('away')}
          className="px-3 py-2 rounded-lg bg-secondary border border-red-700/20 text-foreground hover:border-red-500/40 text-xs font-semibold">
          +1 {awayTeam.name || 'Ospite'}
        </button>
        <button onClick={() => setShowSubstitution(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Cambio
        </button>
        <button onClick={endSet}
          className="px-3 py-2 rounded-lg bg-secondary text-warning hover:bg-warning/10 text-xs font-semibold">
          Fine Set
        </button>
        <button onClick={handleExportDVW}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold ml-auto">
          <Download className="w-3.5 h-3.5" /> DVW
        </button>
      </div>
    </div>
  );
}
