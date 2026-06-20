import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useMatchStore } from '@/store/matchStore';
import { useScoutSettings } from '@/lib/scoutSettings';
import { generateDVW } from '@/lib/dvwExporter';
import { upsertScoutSession } from '@/lib/scoutPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_LABELS } from '@/types/volleyball';
import type { Skill, ScoutAction } from '@/types/volleyball';

import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { ActionPanel } from '@/components/ActionPanel';
import { AttackHeatmap } from '@/components/AttackHeatmap';
import { PlayerStatsPanel } from '@/components/PlayerStatsPanel';
import { InSetStatsPanel } from '@/components/InSetStatsPanel';
import { QuickActions } from '@/components/QuickActions';
import { CSToolbar } from '@/components/scout/CSToolbar';
import { CSServePanel } from '@/components/scout/CSServePanel';
import { CSRallyHistory } from '@/components/scout/CSRallyHistory';
import { CSLiveString } from '@/components/scout/CSLiveString';
import { ScoutSettingsPanel } from '@/components/scout/ScoutSettingsPanel';
import { TouchFlowPanel, type ScoutingMode } from '@/components/scout/TouchFlowPanel';
import { LiveFooter } from '@/components/scout/LiveFooter';
import { suggestNextTouch, SKILL_BANNER, type TouchSuggestion } from '@/lib/scoutSuggestions';
import { resolvePlayerPosition, nearestZone } from '@/lib/courtPositionResolver';
import { FullscreenToggle } from '@/components/FullscreenToggle';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type RightTab = 'log' | 'stats' | 'heat' | 'quick';

const SKILLS_WITH_ZONE: Skill[] = ['A', 'S', 'R', 'D'];

export function LiveScout() {
  const {
    matchState, homeTeam, awayTeam, matchInfo, homeLineup, awayLineup,
    endSet, updateAction, addPoint, addAction, undoLastAction, undoRally,
    callTimeout, substitutePlayer,
    homeReceptionFormations, awayReceptionFormations,
    homeAttackFormations, awayAttackFormations,
    homeDefenseFormations, awayDefenseFormations,
  } = useMatchStore();
  const removeLastTouchFromCurrentRally = useMatchStore(s => s.removeLastTouchFromCurrentRally);
  const { settings, setSetting, setSettings } = useScoutSettings();
  const scoutingMode: ScoutingMode =
    (!settings.showAlzata && !settings.showDifesa) ? 'simple' : 'advanced';

  // Stato interno
  const [selectedPlayer, setSelectedPlayer] = useState<{ number: number; team: 'home' | 'away' } | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [zoneSelectMode, setZoneSelectMode] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  const [pendingTeam, setPendingTeam] = useState<'home' | 'away' | null>(null);
  const [recentActionPlayer, setRecentActionPlayer] = useState<{ number: number; team: 'home' | 'away'; evaluation?: string } | null>(null);
  const [lastSkillByTeam, setLastSkillByTeam] = useState<{ home: Skill | null; away: Skill | null }>({ home: null, away: null });
  const [suggestion, setSuggestion] = useState<TouchSuggestion | null>(null);

  const [rightTab, setRightTab] = useState<RightTab>('log');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endSetDialog, setEndSetDialog] = useState(false);
  const [subDialog, setSubDialog] = useState<{ open: boolean; team: 'home' | 'away'; out: number | null }>({ open: false, team: 'home', out: null });
  const [simplified, setSimplified] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const { user } = useAuth();
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  // Apri dialog fine set quando setOverPending

  useEffect(() => {
    if (matchState.setOverPending) setEndSetDialog(true);
  }, [matchState.setOverPending]);

  // Reset suggerimento e skill pendente a fine rally (punto registrato)
  useEffect(() => {
    setSuggestion(null);
    setPendingSkill(null);
  }, [matchState.homeScore, matchState.awayScore]);

  // Salvataggio automatico su Supabase ogni 5 azioni (best-effort).
  useEffect(() => {
    if (!user || matchState.actions.length === 0) return;
    if (matchState.actions.length % 5 !== 0) return;
    upsertScoutSession(
      sessionIdRef.current, user.id,
      matchInfo, homeTeam, awayTeam, matchState,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState.actions.length]);

  // Heatmap & live arrows (basati su attacchi home)
  const homeHeatmap = useMemo(() => {
    const data: Record<number, number> = {};
    matchState.actions
      .filter((a) => a.skill === 'A' && a.team === 'home' && a.endZone)
      .forEach((a) => { data[a.endZone!] = (data[a.endZone!] || 0) + 1; });
    return Object.keys(data).length > 0 ? data : undefined;
  }, [matchState.actions]);

  const liveArrows = useMemo(() =>
    matchState.actions
      .filter((a) => a.skill === 'A' && a.startZone != null && a.endZone != null)
      .slice(-5)
      .map((a) => ({ startZone: a.startZone!, endZone: a.endZone!, evaluation: a.evaluation })),
    [matchState.actions]
  );

  // === Handlers ===

  /**
   * Calcola la zona DVW (1-9) dalla posizione EFFETTIVA del giocatore sul campo
   * (stessa funzione usata da VolleyballCourt per disegnare il marker, garantendo
   * coerenza tra dove il giocatore appare visivamente e la zona registrata).
   * Ritorna null se il giocatore non è in formazione (es. numero non trovato in lineup).
   */
  const computeZoneForPlayer = (num: number, team: 'home' | 'away'): number | null => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const slotPos = lineup?.indexOf(num);
    if (slotPos == null || slotPos < 0) return null;
    const setterPosition = team === 'home' ? matchState.homeSetterPosition : matchState.awaySetterPosition;
    const phase = team === 'home' ? matchState.teamTacticalPhases.home : matchState.teamTacticalPhases.away;
    const pos = resolvePlayerPosition({
      team,
      slotPos: slotPos + 1,
      setterPosition,
      phase,
      receptionFormations: team === 'home' ? homeReceptionFormations : awayReceptionFormations,
      attackFormations: team === 'home' ? homeAttackFormations : awayAttackFormations,
      defenseFormations: team === 'home' ? homeDefenseFormations : awayDefenseFormations,
    });
    return nearestZone(team, pos);
  };

  const handlePlayerClick = (num: number, team: 'home' | 'away') => {
    if (zoneSelectMode) return;
    setSelectedPlayer({ number: num, team });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setBottomSheetOpen(true);
    }
  };
  const handleActionComplete = (actionId: string, skill: Skill) => {
    setBottomSheetOpen(false);
    setPendingSkill(null);
    const team = selectedPlayer?.team ?? null;
    const num = selectedPlayer?.number ?? null;
    if (team) {
      setLastSkillByTeam((prev) => ({ ...prev, [team]: skill }));
    }
    // Flusso semplificato: per Ricezione e Attacco, la zona si deduce automaticamente
    // dalla posizione del giocatore selezionato (confermato dal manuale Click&Scout:
    // "the direction of the serve corresponds to the position of the receiver on court").
    if ((skill === 'R' || skill === 'A') && num !== null && team && actionId) {
      const zone = computeZoneForPlayer(num, team);
      if (zone !== null) {
        updateAction(actionId, skill === 'A' ? { endZone: zone } : { startZone: zone });
      }
    }
    // Opzione disaccoppiata (settings.showEndZone): per la Battuta, invece di dedurre
    // automaticamente, l'operatore clicca il punto esatto di atterraggio sul campo
    // della squadra che RICEVE (non quella che ha servito — qui sta la correzione
    // rispetto al vecchio comportamento, che mostrava l'overlay sul campo sbagliato),
    // e solo dopo assegna manualmente quale giocatore ha ricevuto.
    if (skill === 'S' && settings.showEndZone && team && actionId) {
      const receivingTeam = team === 'home' ? 'away' : 'home';
      setPendingActionId(actionId);
      setPendingSkill(skill);
      setPendingTeam(receivingTeam);
      setZoneSelectMode(true);
    }
    setSelectedPlayer(null);
    if (num !== null && team) {
      const last = matchState.actions[matchState.actions.length - 1];
      setRecentActionPlayer({ number: num, team, evaluation: last?.evaluation });
      window.setTimeout(() => setRecentActionPlayer(null), 700);
    }
    const lastAction = matchState.actions[matchState.actions.length - 1];
    const nextSugg = suggestNextTouch(
      skill, team, lastAction?.evaluation ?? null,
      scoutingMode === 'simple', matchState.servingTeam,
    );
    let suggestedPlayerNumber: number | null = null;
    if (nextSugg.skill === 'S' && nextSugg.team) {
      const lineup = nextSugg.team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
      suggestedPlayerNumber = lineup?.[0] ?? null;
    }
    setSuggestion(nextSugg.skill ? { ...nextSugg, playerNumber: suggestedPlayerNumber } : null);
  };

  const handleZoneSelect = (zone: number) => {
    if (pendingActionId) {
      if (pendingSkill === 'A') {
        updateAction(pendingActionId, { endZone: zone });
      } else {
        updateAction(pendingActionId, { startZone: zone });
      }
      toast.success(`Zona ${zone} registrata`, { duration: 1200 });
    }
    setZoneSelectMode(false);
    setPendingActionId(null);
    setPendingSkill(null);
    setPendingTeam(null);
  };

  const skipZone = () => {
    setZoneSelectMode(false);
    setPendingActionId(null);
    setPendingSkill(null);
    setPendingTeam(null);
  };

  // Export DVW
  const handleExportDVW = () => {
    const dvw = generateDVW(
      matchInfo, homeTeam, awayTeam, homeLineup, awayLineup,
      matchState.actions, matchState.setResults,
      matchState.homeSetsWon, matchState.awaySetsWon
    );
    const filename = `${homeTeam.code || 'HOME'}_${awayTeam.code || 'AWAY'}_${matchInfo.date}.dvw`;
    const blob = new Blob([dvw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`File DVW scaricato: ${filename}`);
  };

  // Sostituzione
  const openSub = (team: 'home' | 'away') => setSubDialog({ open: true, team, out: null });
  const confirmSubIn = (inNum: number) => {
    if (subDialog.out != null) {
      substitutePlayer(subDialog.team, subDialog.out, inNum);
      toast.success(`Sostituzione: #${subDialog.out} → #${inNum}`);
    }
    setSubDialog({ open: false, team: subDialog.team, out: null });
  };

  // Timeout
  const handleTimeout = (team: 'home' | 'away') => {
    const ok = callTimeout(team);
    const name = team === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');
    if (ok) toast.success(`Time-out ${name}`);
    else toast.error('Time-out non disponibili');
  };

  const recentActions = [...matchState.actions].reverse().slice(0, 50);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <FullscreenToggle />

      {/* HEADER: ScoreBoard */}
      <div className="shrink-0 px-2 pt-2">
        <ScoreBoard />
      </div>

      {/* FOOTER FISSA skill+evaluation, stile OpenVolleyScout: sempre visibile, sopra il campo */}
      <LiveFooter
        selectedPlayer={selectedPlayer}
        selectedSkill={pendingSkill}
        mode={scoutingMode}
        suggestedSkill={suggestion?.skill ?? null}
        onSkillSelect={(skill) => setPendingSkill(skill)}
        onEvaluationSelect={(evaluation) => {
          if (!selectedPlayer || !pendingSkill) return;
          const id = addAction({
            team: selectedPlayer.team,
            playerNumber: selectedPlayer.number,
            skill: pendingSkill,
            skillType: 'H',
            evaluation,
            timestamp: '',
            code: '',
          });
          if (settings.autoPoint && evaluation === '#' && pendingSkill === 'S') {
            addPoint(selectedPlayer.team);
          } else if (settings.autoPoint && evaluation === '='
              && (pendingSkill === 'S' || pendingSkill === 'A')) {
            const opp = selectedPlayer.team === 'home' ? 'away' : 'home';
            addPoint(opp);
          }
          handleActionComplete(id, pendingSkill);
        }}
      />

      {/* DESKTOP layout (≥ md) */}
      <div className="hidden md:flex flex-1 min-h-0 gap-2 p-2 overflow-hidden">
        {/* Colonna campi */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* CSServePanel + banner suggerimento + toggle pulito */}
          <div className="flex items-center gap-2">
            <CSServePanel />
            <div className="flex-1" />
            {suggestion?.skill && suggestion.team && (
              <div className={`min-h-[44px] px-3 rounded-md border-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                suggestion.team === 'home'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  : 'border-red-500/40 bg-red-500/10 text-red-400'
              }`}>
                <span>{SKILL_BANNER[suggestion.skill]}</span>
                <span className="opacity-60">→</span>
                <span className="truncate max-w-[120px]">
                  {suggestion.team === 'home'
                    ? (homeTeam.name || 'Casa')
                    : (awayTeam.name || 'Ospite')}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSimplified((v) => !v)}
              className={`min-h-[44px] px-3 rounded-md border-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 ${
                simplified ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-foreground'
              }`}
            >
              {simplified ? <><EyeOff className="w-3 h-3" /> Dettagli</> : <><Eye className="w-3 h-3" /> Pulito</>}
            </button>
            {zoneSelectMode && (
              <button
                type="button"
                onClick={skipZone}
                className="min-h-[44px] px-3 rounded-md border-2 border-warning bg-warning/20 text-warning text-xs font-black uppercase tracking-wider active:scale-95"
              >
                Skip zona
              </button>
            )}
          </div>

          {/* Campi affiancati */}
          <div className="flex-1 min-h-0 px-1 pt-4">
            <VolleyballCourt
              layout="split"
              heatmapData={homeHeatmap}
              liveArrows={liveArrows}
              highlightTeam={suggestion?.team ?? null}
              highlightPlayerNumber={suggestion?.playerNumber ?? null}
              receptionMode={{
                home: matchState.servingTeam === 'away',
                away: matchState.servingTeam === 'home',
              }}
              simplifiedView={simplified}
              onPlayerClick={handlePlayerClick}
              selectedPlayer={selectedPlayer}
              recentActionPlayer={recentActionPlayer}
              selectedZone={null}
              onZoneClick={zoneSelectMode ? (z) => handleZoneSelect(z) : undefined}
              zoneSelectTeam={zoneSelectMode && pendingTeam ? pendingTeam : undefined}
              zoneSelectSkill={zoneSelectMode ? pendingSkill : undefined}
            />
          </div>

          {/* Rally history */}
          <CSRallyHistory />
        </div>

        {/* Pannello laterale destro */}
        <div className="w-[320px] shrink-0 flex flex-col gap-2 min-h-0">
          {selectedPlayer ? (
            <div className="flex-1 min-h-0">
              <TouchFlowPanel
                selectedPlayer={(() => {
                  const td = selectedPlayer.team === 'home' ? homeTeam : awayTeam;
                  const p = td.players.find(pl => pl.number === selectedPlayer.number);
                  return {
                    number: selectedPlayer.number,
                    lastName: p?.lastName ?? `#${selectedPlayer.number}`,
                    role: p?.role,
                    team: selectedPlayer.team,
                  };
                })()}
                selectedSkill={pendingSkill}
                mode={scoutingMode}
                suggestedSkill={
                  suggestion?.team === selectedPlayer.team ? suggestion.skill : null
                }
                suggestedEvaluation={
                  suggestion?.team === selectedPlayer.team ? suggestion.evaluation : null
                }
                teamName={selectedPlayer.team === 'home'
                  ? (homeTeam.name || 'Casa')
                  : (awayTeam.name || 'Ospite')}
                onSkillSelect={(skill) => {
                  if (skill === null) { setPendingSkill(null); return; }
                  setPendingSkill(skill);
                }}
                onEvaluationSelect={(evaluation) => {
                  const skillToUse = pendingSkill
                    ?? (scoutingMode === 'simple'
                        && suggestion?.team === selectedPlayer.team
                        ? suggestion.skill : null);
                  if (!skillToUse) return;
                  const id = addAction({
                    team: selectedPlayer.team,
                    playerNumber: selectedPlayer.number,
                    skill: skillToUse,
                    skillType: 'H',
                    evaluation,
                    timestamp: '',
                    code: '',
                  });
                  if (settings.autoPoint && evaluation === '#' && skillToUse === 'S') {
                    addPoint(selectedPlayer.team);
                  } else if (settings.autoPoint && evaluation === '='
                      && (skillToUse === 'S' || skillToUse === 'A')) {
                    const opp = selectedPlayer.team === 'home' ? 'away' : 'home';
                    addPoint(opp);
                  }
                  handleActionComplete(id, skillToUse);
                }}
                onCancel={() => {
                  setSelectedPlayer(null);
                  setPendingSkill(null);
                }}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50">
                {(['log', 'stats', 'heat', 'quick'] as const).map((t) => {
                  const active = rightTab === t;
                  const labels: Record<RightTab, string> = { log: 'Log', stats: 'Stats', heat: 'Heatmap', quick: 'Quick' };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRightTab(t)}
                      className={`text-xs font-black uppercase tracking-wider py-2 rounded transition-colors active:scale-95 ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto glass rounded-xl p-3">
                {rightTab === 'log' && <ActionLog actions={recentActions} />}
                {rightTab === 'stats' && (
                  <div className="space-y-3">
                    <InSetStatsPanel />
                    <PlayerStatsPanel />
                  </div>
                )}
                {rightTab === 'heat' && <AttackHeatmap team="all" />}
                {rightTab === 'quick' && <QuickActions />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBILE layout (< md) */}
      <div className="md:hidden flex-1 min-h-0 flex flex-col gap-2 p-2 overflow-hidden">
        <div className="flex-1 min-h-0">
          <VolleyballCourt
            layout="split"
            highlightTeam={suggestion?.team ?? null}
            highlightPlayerNumber={suggestion?.playerNumber ?? null}
            simplifiedView={simplified}
            onPlayerClick={handlePlayerClick}
            selectedPlayer={selectedPlayer}
            recentActionPlayer={recentActionPlayer}
            selectedZone={null}
            onZoneClick={zoneSelectMode ? (z) => handleZoneSelect(z) : undefined}
            zoneSelectTeam={zoneSelectMode && pendingTeam ? pendingTeam : undefined}
          />
        </div>
        <CSRallyHistory />
      </div>

      {/* STRINGA DVW LIVE del rally corrente */}
      <CSLiveString />

      {/* TOOLBAR BOTTOM (fissa) */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-2 py-2">
        <CSToolbar
          homeName={homeTeam.name || 'Casa'}
          awayName={awayTeam.name || 'Ospite'}
          homeTimeoutsLeft={2 - matchState.homeTimeoutsUsed}
          awayTimeoutsLeft={2 - matchState.awayTimeoutsUsed}
          onPointHome={() => addPoint('home')}
          onPointAway={() => addPoint('away')}
          onUndoAction={undoLastAction}
          onRemoveLastTouch={() => {
            const removed = removeLastTouchFromCurrentRally();
            if (!removed) {
              toast.info('Nessun tocco da rimuovere nel rally corrente', { duration: 1200 });
            }
          }}
          onUndoRally={() => {
            const n = undoRally();
            if (n > 0) toast.success(`Rally annullato (${n} azioni)`);
            else toast.info('Nessuna azione nel rally corrente');
          }}
          onSubstitution={() => openSub('home')}
          onTimeoutHome={() => handleTimeout('home')}
          onTimeoutAway={() => handleTimeout('away')}
          onEndSet={() => {
            if (user) {
              upsertScoutSession(
                sessionIdRef.current, user.id,
                matchInfo, homeTeam, awayTeam, matchState,
              );
            }
            setEndSetDialog(true);
          }}
          onExport={handleExportDVW}
          onSettings={() => setSettingsOpen(true)}
          onQuickActions={() => setQuickOpen(true)}
        />
      </div>

      {/* BOTTOM SHEET: azione */}
      <Sheet open={bottomSheetOpen} onOpenChange={(o) => { if (!o) { setBottomSheetOpen(false); setSelectedPlayer(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[80vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Registrazione azione</SheetTitle>
          </SheetHeader>
          <ActionPanel
            player={selectedPlayer}
            suggestedSkill={selectedPlayer ? lastSkillByTeam[selectedPlayer.team] : null}
            onComplete={handleActionComplete}
            onClose={() => { setBottomSheetOpen(false); setSelectedPlayer(null); }}
          />
        </SheetContent>
      </Sheet>

      {/* Sheet azioni rapide (mobile-first) */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Azioni rapide
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            <QuickActions />
          </div>
        </SheetContent>
      </Sheet>


      {/* Sheet impostazioni */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Impostazioni scout</SheetTitle>
          </SheetHeader>
          <ScoutSettingsPanel settings={settings} setSetting={setSetting} setSettings={setSettings} />
        </SheetContent>
      </Sheet>

      {/* Dialog fine set */}
      <Dialog open={endSetDialog} onOpenChange={setEndSetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fine set {matchState.currentSet}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-3xl font-black">
              {homeTeam.name || 'Casa'} {matchState.homeScore} — {matchState.awayScore} {awayTeam.name || 'Ospite'}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEndSetDialog(false)}
                className="min-h-12 flex-1 rounded bg-secondary font-bold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => { endSet(); setEndSetDialog(false); }}
                className="min-h-12 flex-1 rounded bg-primary font-black text-primary-foreground"
              >
                Conferma
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog sostituzione */}
      <Dialog open={subDialog.open} onOpenChange={(o) => setSubDialog((s) => ({ ...s, open: o, out: null }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sostituzione</DialogTitle>
          </DialogHeader>
          <SubstitutionPicker
            team={subDialog.team}
            setTeam={(t) => setSubDialog({ open: true, team: t, out: null })}
            outNumber={subDialog.out}
            onPickOut={(n) => setSubDialog((s) => ({ ...s, out: n }))}
            onPickIn={confirmSubIn}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function ActionLog({ actions }: { actions: ScoutAction[] }) {
  return (
    <>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        Ultime azioni ({actions.length})
      </div>
      <div className="space-y-1">
        {actions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-6">
            Nessuna azione registrata
          </div>
        )}
        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${a.team === 'home' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span className="font-mono text-primary font-bold">#{a.playerNumber}</span>
            <span className="text-muted-foreground">{SKILL_LABELS[a.skill]}</span>
            <span className={`font-bold ${
              a.evaluation === '#' || a.evaluation === '+' ? 'text-accent' :
              a.evaluation === '=' || a.evaluation === '/' ? 'text-destructive' :
              'text-warning'
            }`}>
              {a.evaluation}
            </span>
            {(a.startZone || a.endZone) && (
              <span className="text-primary/60 text-[10px] font-mono">
                {a.startZone || '?'}→{a.endZone || '?'}
              </span>
            )}
            <span className="text-muted-foreground/50 ml-auto text-[10px]">{a.timestamp}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function SubstitutionPicker({
  team, setTeam, outNumber, onPickOut, onPickIn,
}: {
  team: 'home' | 'away';
  setTeam: (t: 'home' | 'away') => void;
  outNumber: number | null;
  onPickOut: (n: number) => void;
  onPickIn: (n: number) => void;
}) {
  const { homeTeam, awayTeam, matchState } = useMatchStore();
  const teamData = team === 'home' ? homeTeam : awayTeam;
  const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
  const onCourt = lineup.map((n) => {
    const p = teamData.players.find((pp) => pp.number === n);
    return { number: n, name: p?.lastName || `#${n}`, isLibero: p?.isLibero };
  });
  const bench = teamData.players
    .filter((p) => !lineup.includes(p.number) && !p.isLibero)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['home', 'away'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTeam(t)}
            className={`min-h-12 flex-1 px-4 rounded text-sm font-bold active:scale-95 ${
              team === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {t === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}
          </button>
        ))}
      </div>
      {!outNumber ? (
        <>
          <p className="text-xs text-muted-foreground">Chi esce?</p>
          <div className="grid grid-cols-3 gap-2">
            {onCourt.map((p) => (
              <button
                key={p.number}
                type="button"
                onClick={() => onPickOut(p.number)}
                className="min-h-[56px] p-3 rounded-lg bg-secondary hover:bg-destructive/20 text-foreground text-sm font-bold active:scale-95"
              >
                #{p.number} {p.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Chi entra al posto di #{outNumber}?</p>
          <div className="grid grid-cols-3 gap-2">
            {bench.map((p) => (
              <button
                key={p.number}
                type="button"
                onClick={() => onPickIn(p.number)}
                className="min-h-[56px] p-3 rounded-lg bg-secondary hover:bg-accent/20 text-foreground text-sm font-bold active:scale-95"
              >
                #{p.number} {p.lastName}
              </button>
            ))}
            {bench.length === 0 && (
              <div className="col-span-3 text-center text-xs text-muted-foreground italic py-4">
                Nessun giocatore disponibile in panchina
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
