import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, Evaluation, SkillType, ServeType, AttackCombo } from '@/types/volleyball';
import { SKILL_LABELS, SERVE_TYPES, ATTACK_COMBOS } from '@/types/volleyball';
import { Undo2, Download, ArrowLeftRight, SkipForward, Shield } from 'lucide-react';
import { generateDVW } from '@/lib/dvwExporter';
import { ZoneCourt } from '@/components/VolleyballCourt';
import { useScoutSettings } from '@/lib/scoutSettings';

type ScoutStep = 'team' | 'player' | 'skill' | 'serveType' | 'attackCombo' | 'evaluation' | 'startZone' | 'endZone';

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
  const [selectedServeType, setSelectedServeType] = useState<ServeType | null>(null);
  const [selectedAttackCombo, setSelectedAttackCombo] = useState<AttackCombo | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [startZone, setStartZone] = useState<number | null>(null);
  const [endZone, setEndZone] = useState<number | null>(null);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [subTeam, setSubTeam] = useState<'home' | 'away'>('home');
  const [subOut, setSubOut] = useState<number | null>(null);
  const [attackFilter, setAttackFilter] = useState<'all' | 'Q' | 'M' | 'T' | 'H' | 'O'>('all');
  const [showLibero, setShowLibero] = useState(false);
  const [liberoTeam, setLiberoTeam] = useState<'home' | 'away'>('home');
  const { settings } = useScoutSettings();

  const skills: { key: Skill; color: string }[] = [
    { key: 'S', color: 'bg-blue-600 hover:bg-blue-500' },
    { key: 'R', color: 'bg-emerald-600 hover:bg-emerald-500' },
    { key: 'A', color: 'bg-red-600 hover:bg-red-500' },
    { key: 'B', color: 'bg-purple-600 hover:bg-purple-500' },
    { key: 'D', color: 'bg-amber-600 hover:bg-amber-500' },
    { key: 'E', color: 'bg-teal-600 hover:bg-teal-500' },
    { key: 'F', color: 'bg-gray-600 hover:bg-gray-500' },
  ].filter((s) =>
    (s.key !== 'E' || settings.showAlzata) &&
    (s.key !== 'D' || settings.showDifesa) &&
    (s.key !== 'F' || settings.showFreeball)
  );

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
    setSelectedServeType(null);
    setSelectedAttackCombo(null);
    setSelectedEvaluation(null);
    setStartZone(null);
    setEndZone(null);
    setAttackFilter('all');
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
    if (skill === 'S' && settings.showServeType) {
      setStep('serveType');
    } else if (skill === 'A' && settings.showAttackCombo) {
      setStep('attackCombo');
    } else {
      setStep('evaluation');
    }
  };

  const handleServeTypeSelect = (st: ServeType) => {
    setSelectedServeType(st);
    setStep('evaluation');
  };

  const handleAttackComboSelect = (combo: AttackCombo) => {
    setSelectedAttackCombo(combo);
    setStep('evaluation');
  };

  const handleEvaluationSelect = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    if (selectedSkill && TRAJECTORY_SKILLS.includes(selectedSkill) && settings.showStartZone) {
      setStep('startZone');
    } else {
      finalizeAction(evaluation, null, null);
    }
  };

  const handleStartZone = (zone: number) => {
    setStartZone(zone);
    if (settings.showEndZone) {
      setStep('endZone');
    } else if (selectedEvaluation) {
      finalizeAction(selectedEvaluation, zone, null);
    }
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

  const finalizeAction = (evaluation: Evaluation, sz: number | null, ez: number | null) => {
    if (!selectedTeam || selectedPlayer === null || !selectedSkill) return;

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;

    // Determine skill type from serve type, attack combo, or default
    let skillType: SkillType = 'H';
    if (selectedSkill === 'S' && selectedServeType) {
      skillType = selectedServeType as SkillType;
    } else if (selectedSkill === 'A' && selectedAttackCombo) {
      skillType = selectedAttackCombo.tempo as SkillType;
    }

    const teamPrefix = selectedTeam === 'home' ? '*' : 'a';
    const playerStr = String(selectedPlayer).padStart(2, '0');
    const attackCodeStr = selectedAttackCombo?.code || '~~';
    const szStr = sz ? String(sz) : '~';
    const ezStr = ez ? String(ez) : '~';
    const code = `${teamPrefix}${playerStr}${selectedSkill}${skillType}${evaluation}${attackCodeStr}~${szStr}${ezStr}`;

    addAction({
      timestamp,
      team: selectedTeam,
      playerNumber: selectedPlayer,
      skill: selectedSkill,
      skillType,
      evaluation,
      startZone: sz ?? undefined,
      endZone: ez ?? undefined,
      attackCode: selectedAttackCombo?.code,
      serveType: selectedServeType ?? undefined,
      code,
    });

    // Auto-score
    if (settings.autoPoint && (selectedSkill === 'A' || selectedSkill === 'S' || selectedSkill === 'B') && evaluation === '#') {
      addPoint(selectedTeam);
    } else if (settings.autoPoint && evaluation === '=') {
      addPoint(selectedTeam === 'home' ? 'away' : 'home');
    }

    resetSelection();
  };


  const goBack = () => {
    if (step === 'endZone') {
      setEndZone(null);
      setStep('startZone');
    } else if (step === 'startZone') {
      setStartZone(null);
      setSelectedEvaluation(null);
      setStep('evaluation');
    } else if (step === 'evaluation') {
      setSelectedEvaluation(null);
      if (selectedSkill === 'A' && settings.showAttackCombo) setStep('attackCombo');
      else if (selectedSkill === 'S' && settings.showServeType) setStep('serveType');
      else setStep('skill');
    } else if (step === 'attackCombo') {
      setSelectedAttackCombo(null);
      setStep('skill');
    } else if (step === 'serveType') {
      setSelectedServeType(null);
      setStep('skill');
    } else if (step === 'skill') {
      setSelectedSkill(null);
      setStep('player');
    } else if (step === 'player') {
      setSelectedPlayer(null);
      setStep('team');
    }
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

  // Libero in/out: swap libero with a back-row player (typically a middle).
  // If libero is currently on court, brings the original player back.
  const handleLiberoSwap = (playerNumber: number) => {
    const team = liberoTeam;
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const lineupKey = team === 'home' ? 'homeLineup' : 'awayLineup';
    const initialLineup = team === 'home' ? homeLineup : awayLineup;

    const liberoId = initialLineup.libero1;
    const liberoPlayer = teamData.players.find(p => p.id === liberoId);
    if (!liberoPlayer) return;

    const liberoIsOn = lineup.includes(liberoPlayer.number);
    if (liberoIsOn) {
      // Bring libero out, swap back the chosen back-row player (must be off court)
      substitutePlayer(team, liberoPlayer.number, playerNumber);
    } else {
      // Bring libero in for the chosen back-row player
      substitutePlayer(team, playerNumber, liberoPlayer.number);
    }
    setShowLibero(false);
  };

  // Libero modal
  if (showLibero) {
    const teamData = liberoTeam === 'home' ? homeTeam : awayTeam;
    const lineup = liberoTeam === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const initialLineup = liberoTeam === 'home' ? homeLineup : awayLineup;
    const liberoPlayer = teamData.players.find(p => p.id === initialLineup.libero1);
    const liberoOnCourt = liberoPlayer ? lineup.includes(liberoPlayer.number) : false;
    // Back row positions: P1, P5, P6 (indices 0, 4, 5 in the lineup array)
    const backRowIndices = [0, 4, 5];
    const backRowNumbers = backRowIndices
      .map(i => lineup[i])
      .filter((n): n is number => typeof n === 'number' && n > 0);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            Libero {liberoOnCourt ? 'OUT' : 'IN'}
          </h3>
          <button onClick={() => setShowLibero(false)} className="min-h-12 px-4 rounded-lg bg-secondary text-sm font-bold text-muted-foreground hover:text-foreground transition-transform duration-75 active:scale-95">Annulla</button>
        </div>

        <div className="flex gap-2">
          {(['home', 'away'] as const).map(t => {
            const lp = (t === 'home' ? homeTeam : awayTeam).players.find(
              p => p.id === (t === 'home' ? homeLineup : awayLineup).libero1
            );
            return (
              <button key={t} onClick={() => setLiberoTeam(t)}
                className={`px-3 py-1.5 rounded text-sm font-bold ${liberoTeam === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {t === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite'}
                {lp && <span className="ml-1 text-[10px] opacity-70">L#{lp.number}</span>}
              </button>
            );
          })}
        </div>

        {!liberoPlayer ? (
          <p className="text-xs text-destructive">
            Nessun libero designato per questa squadra. Configuralo nel lineup iniziale.
          </p>
        ) : liberoOnCourt ? (
          <>
            <p className="text-xs text-muted-foreground">
              Libero <span className="text-yellow-400 font-bold">#{liberoPlayer.number} {liberoPlayer.lastName}</span> in
              campo. Chi rientra al suo posto?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {teamData.players
                .filter(p => !p.isLibero && !lineup.includes(p.number))
                .map(p => (
                  <button key={p.number} onClick={() => handleLiberoSwap(p.number)}
                    className="min-h-16 p-4 rounded-lg bg-secondary hover:bg-yellow-500/20 text-foreground text-base font-bold transition-transform duration-75 active:scale-95">
                    {p.number} {p.lastName}
                  </button>
                ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Libero <span className="text-yellow-400 font-bold">#{liberoPlayer.number} {liberoPlayer.lastName}</span> in panchina.
              Per chi entra (seconda linea)?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {backRowNumbers.map(num => {
                const p = teamData.players.find(pp => pp.number === num);
                return (
                  <button key={num} onClick={() => handleLiberoSwap(num)}
                    className="min-h-16 p-4 rounded-lg bg-secondary hover:bg-yellow-500/20 text-foreground text-base font-bold transition-transform duration-75 active:scale-95">
                    {num} {p?.lastName || ''}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

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
          <button onClick={() => { setShowSubstitution(false); setSubOut(null); }} className="min-h-12 px-4 rounded-lg bg-secondary text-sm font-bold text-muted-foreground hover:text-foreground transition-transform duration-75 active:scale-95">Annulla</button>
        </div>
        {!subOut ? (
          <>
            <p className="text-xs text-muted-foreground">Chi esce?</p>
            <div className="flex gap-2 flex-wrap">
              {(['home', 'away'] as const).map(t => (
                <button key={t} onClick={() => setSubTeam(t)}
                  className={`px-3 py-1.5 rounded text-sm font-bold ${subTeam === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {t === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {lineup.map(p => (
                <button key={p.number} onClick={() => setSubOut(p.number)}
                  className="min-h-16 p-4 rounded-lg bg-secondary hover:bg-destructive/20 text-foreground text-base font-bold transition-transform duration-75 active:scale-95">
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
                  className="min-h-16 p-4 rounded-lg bg-secondary hover:bg-accent/20 text-foreground text-base font-bold transition-transform duration-75 active:scale-95">
                  {p.number} {p.lastName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Filtered attack combos
  const filteredCombos = attackFilter === 'all'
    ? ATTACK_COMBOS
    : ATTACK_COMBOS.filter(c => c.tempo === attackFilter);

  const tempoLabels: Record<string, string> = {
    all: 'Tutte',
    Q: '1° Tempo',
    M: '2° Tempo',
    T: '3° Tempo',
    H: 'Palla Alta',
    O: 'Altro',
  };

  const tempoColors: Record<string, string> = {
    Q: 'border-red-500/40 bg-red-500/10',
    M: 'border-orange-500/40 bg-orange-500/10',
    T: 'border-yellow-500/40 bg-yellow-500/10',
    H: 'border-blue-500/40 bg-blue-500/10',
    O: 'border-muted-foreground/30 bg-muted/30',
    N: 'border-muted-foreground/30 bg-muted/30',
    U: 'border-muted-foreground/30 bg-muted/30',
  };

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      {step !== 'team' && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button onClick={goBack} className="min-h-10 min-w-10 rounded bg-secondary text-foreground font-black transition-transform duration-75 active:scale-95">←</button>
          <button onClick={resetSelection} className="min-h-10 min-w-10 rounded bg-secondary text-destructive hover:text-destructive/80 font-black transition-transform duration-75 active:scale-95">✕</button>
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
          {selectedServeType && (
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
              {SERVE_TYPES.find(s => s.key === selectedServeType)?.label}
            </span>
          )}
          {selectedAttackCombo && (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold">
              {selectedAttackCombo.code}
            </span>
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
            className="min-h-24 w-full p-4 rounded-xl bg-secondary border-2 border-blue-700/30 hover:border-blue-500/60 text-foreground text-2xl font-black transition-all touch-target active:scale-95 duration-75">
            {homeTeam.name || 'Casa'}
          </button>
          <button onClick={() => handleTeamSelect('away')}
            className="min-h-24 w-full p-4 rounded-xl bg-secondary border-2 border-red-700/30 hover:border-red-500/60 text-foreground text-2xl font-black transition-all touch-target active:scale-95 duration-75">
            {awayTeam.name || 'Ospite'}
          </button>
        </div>
      )}

      {/* Step: Player */}
      {step === 'player' && selectedTeam && (
        <div className="grid grid-cols-3 gap-2">
          {getTeamLineup(selectedTeam).map((p, i) => (
            <button key={p.number} onClick={() => handlePlayerSelect(p.number)}
              className="min-h-20 p-4 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/50 text-foreground transition-all touch-target active:scale-95 duration-75">
              <div className="text-4xl font-black text-primary">{p.number}</div>
              <div className="text-sm truncate text-muted-foreground">{p.name}</div>
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
              className={`min-h-16 p-3 rounded-xl ${s.color} text-primary-foreground font-bold transition-all touch-target active:scale-95 duration-75`}>
              <div className="text-2xl font-black">{s.key}</div>
              <div className="text-sm">{SKILL_LABELS[s.key]}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step: Serve Type */}
      {step === 'serveType' && (
        <div className="space-y-2">
          <span className="text-sm font-bold text-foreground">Tipo di Battuta</span>
          <button onClick={() => { setSelectedServeType(null); setStep('evaluation'); }} className="w-full min-h-14 rounded-xl bg-secondary border-2 border-dashed border-border text-base font-bold text-foreground transition-transform duration-75 active:scale-95">↩ Salta tipo</button>
          <div className="grid grid-cols-3 gap-2">
            {SERVE_TYPES.map(st => (
              <button key={st.key} onClick={() => handleServeTypeSelect(st.key)}
                className="min-h-16 p-3 rounded-xl bg-blue-900/30 border border-blue-700/30 hover:border-blue-500/50 text-foreground font-semibold transition-all touch-target active:scale-95 duration-75">
                <div className="text-lg font-bold text-blue-300">{st.label}</div>
                <div className="text-[10px] text-muted-foreground">{st.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Attack Combo */}
      {step === 'attackCombo' && (
        <div className="space-y-2">
          <span className="text-sm font-bold text-foreground">Combinazione Attacco</span>
          <button onClick={() => { setSelectedAttackCombo(null); setStep('evaluation'); }} className="w-full min-h-14 rounded-xl bg-secondary border-2 border-dashed border-border text-base font-bold text-foreground transition-transform duration-75 active:scale-95">↩ Salta combinazione</button>
          {/* Tempo filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'Q', 'M', 'T', 'H', 'O'] as const).map(f => (
              <button key={f} onClick={() => setAttackFilter(f)}
                className={`px-4 py-3 min-h-12 rounded text-sm font-bold transition-all active:scale-95 duration-75 ${
                  attackFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}>
                {tempoLabels[f]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
            {filteredCombos.map(combo => (
              <button key={combo.code} onClick={() => handleAttackComboSelect(combo)}
                className={`min-h-16 p-3 rounded-lg border text-foreground text-sm font-semibold transition-all touch-target active:scale-95 duration-75 ${tempoColors[combo.tempo] || 'bg-secondary border-border'}`}>
                <div className="text-sm font-bold">{combo.code}</div>
                <div className="text-[9px] text-muted-foreground leading-tight truncate">{combo.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Evaluation */}
      {step === 'evaluation' && (
        <div className="grid grid-cols-2 gap-2">
          {evaluations.map(e => (
            <button key={e.key} onClick={() => handleEvaluationSelect(e.key)}
              className={`min-h-20 p-3 rounded-xl ${e.color} text-primary-foreground text-xl font-black transition-all touch-target active:scale-95 duration-75`}>
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
            <button onClick={skipZones} className="w-full min-h-14 rounded-xl bg-secondary text-base font-bold text-foreground transition-transform duration-75 active:scale-95">
              <SkipForward className="inline w-4 h-4 mr-1" /> Salta
            </button>
          </div>
          <ZoneCourt mode="select-start" onZoneClick={handleStartZone} side={selectedTeam || 'home'} skill={selectedSkill} large={true} />
        </div>
      )}

      {/* Step: End Zone */}
      {step === 'endZone' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Zona di arrivo</span>
            <button onClick={skipZones} className="w-full min-h-14 rounded-xl bg-secondary text-base font-bold text-foreground transition-transform duration-75 active:scale-95">
              <SkipForward className="inline w-4 h-4 mr-1" /> Salta
            </button>
          </div>
          <ZoneCourt mode="select-end" onZoneClick={handleEndZone} startZone={startZone} side={selectedTeam || 'home'} large={true} />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
        <button onClick={undoLastAction} disabled={matchState.actions.length === 0}
          className="flex items-center gap-1 min-h-14 px-4 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-sm font-bold disabled:opacity-30">
          <Undo2 className="w-3.5 h-3.5" /> Annulla
        </button>
        <button onClick={() => addPoint('home')}
          className="min-h-14 px-4 rounded-lg bg-secondary border border-blue-700/20 text-foreground hover:border-blue-500/40 text-sm font-bold">
          +1 {homeTeam.name || 'Casa'}
        </button>
        <button onClick={() => addPoint('away')}
          className="min-h-14 px-4 rounded-lg bg-secondary border border-red-700/20 text-foreground hover:border-red-500/40 text-sm font-bold">
          +1 {awayTeam.name || 'Ospite'}
        </button>
        <button onClick={() => setShowSubstitution(true)}
          className="flex items-center gap-1 min-h-14 px-4 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-sm font-bold">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Cambio
        </button>
        <button onClick={() => setShowLibero(true)}
          className="flex items-center gap-1 min-h-14 px-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 text-sm font-bold">
          <Shield className="w-3.5 h-3.5" /> Libero
        </button>
        <button onClick={endSet}
          className="min-h-14 px-4 rounded-lg bg-secondary text-warning hover:bg-warning/10 text-sm font-bold">
          Fine Set
        </button>
        <button onClick={handleExportDVW}
          className="flex items-center gap-1 min-h-14 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold ml-auto">
          <Download className="w-3.5 h-3.5" /> DVW
        </button>
      </div>
    </div>
  );
}
