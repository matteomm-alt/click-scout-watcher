import { autoPointWinner } from '@/lib/autoPoint';
import { toCourtPoint } from '@/lib/courtCoords';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMatchStore } from '@/store/matchStore';
import { useScoutSettings } from '@/lib/scoutSettings';
import { generateDVW } from '@/lib/dvwExporter';
import { upsertScoutSession } from '@/lib/scoutPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { ATTACK_COMBOS } from '@/types/volleyball';
import type { Skill, AttackType } from '@/types/volleyball';
import { safeUUID, cn } from '@/lib/utils';

import { ScoreBoard } from '@/components/ScoreBoard';
import { getInitialPhases } from '@/lib/tacticalPhases';
import { computeLiveHeatmap, liveHeatmapColor, lastAttackArrows, buildLiveReportInput } from '@/lib/liveScoutData';
import { VolleyballCourt, logicalRoleForSlot } from '@/components/VolleyballCourt';
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
import { LiveKpiPanel, LiveKpiBanner } from '@/components/scout/LiveKpiPanel';
import { suggestNextTouch, SKILL_BANNER, type TouchSuggestion } from '@/lib/scoutSuggestions';
import { resolvePlayerPosition, nearestZone, getMiddleComboPosition } from '@/lib/courtPositionResolver';
import { FullscreenToggle } from '@/components/FullscreenToggle';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LiveHeatmapFilters, EndSetDialog, ActionLog, SubstitutionPicker } from '@/components/scout/LiveScoutParts';


type RightTab = 'log' | 'stats' | 'heat' | 'quick' | 'kpi';

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
  const homeOnLeft = matchState.homeCourtSide === 'left';

  // Stato interno
  const [selectedPlayer, setSelectedPlayer] = useState<{ number: number; team: 'home' | 'away' } | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [zoneSelectMode, setZoneSelectMode] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  // Fondamentale a cui appartiene la zona in selezione. Separato da pendingSkill, che si
  // azzera a fine rally (ace/kill): senza, il click finiva su startZone invece che su endZone/landingZone.
  const [zoneSkill, setZoneSkill] = useState<Skill | null>(null);
  const [pendingAttackType, setPendingAttackType] = useState<AttackType>(settings.attaccoPredefinito as AttackType);
  const [pendingMiddleCombo, setPendingMiddleCombo] = useState<string | null>(null);
  const [pendingOtherCombo, setPendingOtherCombo] = useState<string | null>(null);
  const [pendingTeam, setPendingTeam] = useState<'home' | 'away' | null>(null);
  const [recentActionPlayer, setRecentActionPlayer] = useState<{ number: number; team: 'home' | 'away'; evaluation?: string } | null>(null);
  const [lastSkillByTeam, setLastSkillByTeam] = useState<{ home: Skill | null; away: Skill | null }>({ home: null, away: null });
  const [suggestion, setSuggestion] = useState<TouchSuggestion | null>(null);
  // Zona di partenza del servizio pre-impostata cliccando la strip dietro la
  // baseline della squadra che serve (vedi VolleyballCourt). Applicata come
  // startZone alla prossima azione skill='S' che parte dalla stessa squadra.
  const [pendingServeStartZone, setPendingServeStartZone] = useState<{ team: 'home' | 'away'; zone: number } | null>(null);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ team: 'home' | 'away'; zone: number }>).detail;
      if (!detail) return;
      setPendingServeStartZone(detail);
      // A inizio rally la squadra al servizio deve solo scegliere il punto di
      // partenza: il battitore (P1) e il fondamentale Battuta sono automatici.
      const st = useMatchStore.getState().matchState;
      const acts = st.actions;
      const last = acts[acts.length - 1];
      const rallyOpen = !!last
        && `${last.homeScore}-${last.awayScore}` === `${st.homeScore}-${st.awayScore}`
        && !['#', '=', '/'].includes(last.evaluation);
      if (detail.team === st.servingTeam && !rallyOpen) {
        const lineup = detail.team === 'home' ? st.homeCurrentLineup : st.awayCurrentLineup;
        const server = lineup?.[0] ?? null;
        if (server != null) {
          setSelectedPlayer({ number: server, team: detail.team });
          setPendingSkill('S');
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setBottomSheetOpen(true);
          }
        }
      }
    };
    window.addEventListener('scout-serve-start-zone', handler as EventListener);
    return () => window.removeEventListener('scout-serve-start-zone', handler as EventListener);
  }, []);


  // Primo suggerimento della partita: l'operatore ha già scelto chi serve
  // per primo in MatchConfig.tsx (matchState.servingTeam), ma quella scelta
  // non veniva mai usata per evidenziare "Battuta" al primissimo tocco —
  // suggestion restava null finché non si registrava manualmente la prima
  // azione. Si attiva solo quando non esiste ancora nessuna azione, per
  // non interferire mai con i suggerimenti calcolati dopo un tocco reale.
  useEffect(() => {
    if (matchState.actions.length > 0 || suggestion !== null) return;
    const lineup = matchState.servingTeam === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const serverNumber = lineup?.[0] ?? null;
    setSuggestion({ skill: 'S', team: matchState.servingTeam, playerNumber: serverNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState.actions.length, matchState.servingTeam]);

  const [rightTab, setRightTab] = useState<RightTab>('log');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endSetDialog, setEndSetDialog] = useState(false);
  const [subDialog, setSubDialog] = useState<{ open: boolean; team: 'home' | 'away'; out: number | null }>({ open: false, team: 'home', out: null });
  const [simplified, setSimplified] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  // Heatmap live: toggle + filtri (fondamentale, squadra, valutazione, giocatore)
  const [showLiveHeatmap, setShowLiveHeatmap] = useState(false);
  const [heatmapTeamFilter, setHeatmapTeamFilter] = useState<'home' | 'away' | 'all'>('all');
  const [heatmapSkillFilter, setHeatmapSkillFilter] = useState<'A' | 'S' | 'R'>('A');
  const [heatmapEvalFilter, setHeatmapEvalFilter] = useState<'all' | '#' | '+' | '='>('all');
  const [heatmapPlayerFilter, setHeatmapPlayerFilter] = useState<number | null>(null);

  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const sessionIdRef = useRef<string>(safeUUID());

  // Apri dialog fine set quando setOverPending

  useEffect(() => {
    if (matchState.setOverPending) setEndSetDialog(true);
  }, [matchState.setOverPending]);

  // Reset suggerimento e skill pendente a fine rally (punto registrato);
  // la suggestion si reimposta su Battuta con il giocatore in P1 evidenziato
  useEffect(() => {
    setPendingSkill(null);
    const lineup = matchState.servingTeam === 'home'
      ? matchState.homeCurrentLineup
      : matchState.awayCurrentLineup;
    const serverNumber = lineup?.[0] ?? null;
    setSuggestion({
      skill: 'S',
      team: matchState.servingTeam,
      playerNumber: serverNumber,
    });
  }, [matchState.homeScore, matchState.awayScore]);

  // Salvataggio automatico su Supabase (best-effort): al più ogni 8 secondi se è cambiato
  // qualcosa. Si guarda il CONTENUTO delle azioni, non solo quante sono: zone, coordinate e
  // valutazioni (corrette dalla correlazione automatica) arrivano dopo l'inserimento dell'azione.
  const actionsSignature = useMemo(
    () => matchState.actions.map((a) => [
      a.id, a.evaluation, a.startZone, a.endZone, a.landingZone,
      a.startX, a.startY, a.endX, a.endY, a.landingX, a.landingY, a.attackCode,
    ].join('|')).join(';'),
    [matchState.actions],
  );
  const flushTimerRef = useRef<number | null>(null);
  const latestRef = useRef({ matchInfo, homeTeam, awayTeam, matchState });
  latestRef.current = { matchInfo, homeTeam, awayTeam, matchState };
  useEffect(() => {
    if (!user || matchState.actions.length === 0) return;
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      const cur = latestRef.current;
      upsertScoutSession(sessionIdRef.current, user.id, cur.matchInfo, cur.homeTeam, cur.awayTeam, cur.matchState);
    }, 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionsSignature, user]);
  useEffect(() => () => {
    if (flushTimerRef.current !== null) window.clearTimeout(flushTimerRef.current);
  }, []);

  // Heatmap & live arrows — conteggi separati per squadra: ogni azione viene
  // disegnata sulla metà di campo della propria squadra (le zone sono già in
  // numerazione team-relative, calcolate con nearestZone(team, …)).
  const liveHeatmapData = useMemo(
    () => (showLiveHeatmap
      ? computeLiveHeatmap(matchState.actions, {
          skill: heatmapSkillFilter, team: heatmapTeamFilter, evaluation: heatmapEvalFilter, player: heatmapPlayerFilter,
        })
      : undefined),
    [matchState.actions, showLiveHeatmap, heatmapTeamFilter, heatmapSkillFilter, heatmapEvalFilter, heatmapPlayerFilter],
  );

  const heatmapColor = liveHeatmapColor(heatmapSkillFilter);

  const liveArrows = useMemo(() => lastAttackArrows(matchState.actions), [matchState.actions]);

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
    const phase = team === 'home' ? (matchState.teamTacticalPhases ?? getInitialPhases(matchState.servingTeam ?? 'home')).home : (matchState.teamTacticalPhases ?? getInitialPhases(matchState.servingTeam ?? 'home')).away;
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

  const isPlayerMiddleBlocker = (num: number, team: 'home' | 'away'): boolean => {
    const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
    const slotPos = lineup?.indexOf(num);
    if (slotPos == null || slotPos < 0) return false;
    const setterPosition = team === 'home' ? matchState.homeSetterPosition : matchState.awaySetterPosition;
    return logicalRoleForSlot(slotPos + 1, setterPosition) === 'middle';
  };


  /** true se l'ultima azione è una battuta non terminale e `team` è chi riceve. */
  const lastServeNeedsReception = (team: 'home' | 'away'): boolean => {
    const actions = useMatchStore.getState().matchState.actions;
    const last = actions[actions.length - 1];
    if (!last || last.skill !== 'S') return false;
    if (last.evaluation === '#' || last.evaluation === '=') return false;
    return last.team !== team;
  };

  /**
   * true se il rally è già iniziato: esiste almeno un'azione registrata dopo
   * l'ultimo cambio di punteggio. Serve a NON pre-selezionare Battuta a metà
   * scambio quando si tocca un giocatore in zona 1 della squadra al servizio
   * (difesa/attacco da posto 1), errore rilevato nel flusso precedente.
   */
  const rallyInProgress = (): boolean => {
    const st = useMatchStore.getState().matchState;
    const acts = st.actions;
    if (acts.length === 0) return false;
    const last = acts[acts.length - 1];
    return `${last.homeScore}-${last.awayScore}` === `${st.homeScore}-${st.awayScore}`
      && !['#', '=', '/'].includes(last.evaluation);
  };

  const handlePlayerClick = (num: number, team: 'home' | 'away') => {
    if (zoneSelectMode) return;
    setSelectedPlayer({ number: num, team });
    // Auto-suggest aggressivo: se la sua squadra sta servendo e il giocatore
    // è in zona 1 (server "naturale"), preseleziona Battuta — l'operatore
    // salta direttamente alla valutazione. Altrimenti applica il suggerimento
    // contestuale (R/A/S) quando proviene dalla stessa squadra.
    const zone = computeZoneForPlayer(num, team);
    const rallyOpen = rallyInProgress();
    if (lastServeNeedsReception(team)) {
      // Priorità assoluta: dopo una battuta senza ace/errore, il tocco della
      // squadra che riceve è sempre una Ricezione.
      setPendingSkill('R');
    } else if (team === matchState.servingTeam && zone === 1 && !rallyOpen) {
      setPendingSkill('S');
    } else if (suggestion?.team === team && suggestion.skill && suggestion.skill !== 'S') {
      setPendingSkill(suggestion.skill);
    } else if (zone === 1 && !suggestion && !rallyOpen && matchState.actions.length > 0) {

      // Fallback: suggestion è null (resettato da autoPoint) ma il giocatore
      // è in zona 1. Controlliamo se questa squadra ha appena fatto punto
      // dall'ultima azione registrata e pre-selezioniamo S di conseguenza.
      const lastAction = matchState.actions[matchState.actions.length - 1];
      const lastPointTeam = lastAction?.evaluation === '#' ? lastAction?.team
        : lastAction?.evaluation === '=' ? (lastAction?.team === 'home' ? 'away' : 'home')
        : lastAction?.evaluation === '/' ? (lastAction?.team === 'home' ? 'away' : 'home')
        : null;
      if (lastPointTeam === team) {
        setPendingSkill('S');
      }
    }
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
    // Battuta: se l'operatore ha pre-cliccato la zona di partenza nella strip
    // dietro la baseline (VolleyballCourt), applicala come startZone qui.
    if (skill === 'S' && team && actionId && pendingServeStartZone?.team === team) {
      updateAction(actionId, { startZone: pendingServeStartZone.zone });
      setPendingServeStartZone(null);
    }

    // Flusso semplificato: per Ricezione e Attacco, la zona si deduce automaticamente
    // dalla posizione del giocatore selezionato (confermato dal manuale Click&Scout:
    // "the direction of the serve corresponds to the position of the receiver on court").
    if ((skill === 'R' || skill === 'A') && num !== null && team && actionId) {
      const zone = computeZoneForPlayer(num, team);
      if (zone !== null) {
        updateAction(actionId, skill === 'A' ? { endZone: zone } : { startZone: zone });
      }
      // Per il centrale, la combo selezionata sposta fisicamente il punto di stacco
      // rispetto al palleggiatore: ricalcola endZone e annota attackCode.
      if (skill === 'A' && pendingMiddleCombo) {
        const combo = ATTACK_COMBOS.find((c) => c.code === pendingMiddleCombo);
        if (combo?.setterOffsetM != null) {
          const setterPosition = team === 'home' ? matchState.homeSetterPosition : matchState.awaySetterPosition;
          const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
          const setterNum = lineup?.[setterPosition - 1];
          const setterSlot = setterNum != null ? lineup?.indexOf(setterNum) : -1;
          if (setterSlot != null && setterSlot >= 0) {
            const phase = team === 'home' ? (matchState.teamTacticalPhases ?? getInitialPhases(matchState.servingTeam ?? 'home')).home : (matchState.teamTacticalPhases ?? getInitialPhases(matchState.servingTeam ?? 'home')).away;
            const setterPos = resolvePlayerPosition({
              team,
              slotPos: setterSlot + 1,
              setterPosition,
              phase,
              receptionFormations: team === 'home' ? homeReceptionFormations : awayReceptionFormations,
              attackFormations: team === 'home' ? homeAttackFormations : awayAttackFormations,
              defenseFormations: team === 'home' ? homeDefenseFormations : awayDefenseFormations,
            });
            const comboPos = getMiddleComboPosition(setterPos, combo.setterOffsetM, team === 'home');
            const comboZone = nearestZone(team, comboPos);
            updateAction(actionId, { endZone: comboZone, attackCode: combo.code });
          }
        } else if (combo) {
          updateAction(actionId, { attackCode: combo.code });
        }
        setPendingMiddleCombo(null);
      }
      if (skill === 'A' && pendingOtherCombo) {
        updateAction(actionId, { attackCode: pendingOtherCombo });
        setPendingOtherCombo(null);
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
      setZoneSkill(skill);
      setPendingTeam(receivingTeam);
      setZoneSelectMode(true);
    }
    // Punto di caduta reale dell'Attacco, distinto dalla posizione
    // dell'attaccante (endZone, già calcolata sopra e usata per la
    // distribuzione del palleggiatore — non toccata qui). La palla cade
    // sempre nel campo della squadra che NON ha attaccato.
    if (skill === 'A' && settings.showAttackLandingZone && team && actionId) {
      const landingTeam = team === 'home' ? 'away' : 'home';
      setPendingActionId(actionId);
      setPendingSkill(skill);
      setZoneSkill(skill);
      setPendingTeam(landingTeam);
      setZoneSelectMode(true);
    }
    setSelectedPlayer(null);
    // Stato FRESCO dallo store: `matchState` nella closure è ancora quello
    // precedente all'addAction appena eseguito, quindi l'ultima azione letta
    // sarebbe quella del tocco precedente (causa: dopo una battuta non
    // terminale la Ricezione non veniva proposta).
    const freshState = useMatchStore.getState().matchState;
    const lastAction = freshState.actions[freshState.actions.length - 1];
    if (num !== null && team) {
      setRecentActionPlayer({ number: num, team, evaluation: lastAction?.evaluation });
      window.setTimeout(() => setRecentActionPlayer(null), 700);
    }
    const nextSugg = suggestNextTouch(
      skill, team, lastAction?.evaluation ?? null,
      scoutingMode === 'simple', freshState.servingTeam,
    );
    let suggestedPlayerNumber: number | null = null;
    if (nextSugg.skill === 'S' && nextSugg.team) {
      const lineup = nextSugg.team === 'home' ? freshState.homeCurrentLineup : freshState.awayCurrentLineup;
      suggestedPlayerNumber = lineup?.[0] ?? null;
    }
    setSuggestion(nextSugg.skill ? { ...nextSugg, playerNumber: suggestedPlayerNumber } : null);
  };

  const handleZoneSelect = (zone: number, courtTeam?: 'home' | 'away', point?: { x: number; y: number }) => {
    const coords = point ? toCourtPoint(courtTeam ?? pendingTeam ?? 'home', point) : null;
    if (pendingActionId) {
      const zs = zoneSkill ?? pendingSkill;
      if (zs === 'A') {
        // Punto di caduta reale, distinto da endZone (posizione
        // dell'attaccante, già impostata al momento del tocco — non
        // sovrascritta qui, per non alterare la distribuzione del
        // palleggiatore che dipende da quella).
        updateAction(pendingActionId, { landingZone: zone, ...(coords ? { landingX: coords.x, landingY: coords.y } : {}) });
      } else if (zs === 'S') {
        // Zona di atterraggio della battuta, fissata manualmente sul campo di chi
        // riceve. Il giocatore che ha ricevuto si assegna toccandolo normalmente:
        // la sua azione R avrà una propria zona dedotta dalla sua posizione,
        // indipendente da questa (che resta quella scelta qui per la battuta).
        updateAction(pendingActionId, { endZone: zone, ...(coords ? { endX: coords.x, endY: coords.y } : {}) });
        toast.success(`Zona di atterraggio ${zone} registrata — ora tocca il giocatore che ha ricevuto`, { duration: 2200 });
        setSuggestion({ skill: 'R', team: pendingTeam!, playerNumber: null });
        setZoneSelectMode(false);
        setPendingActionId(null);
        setPendingSkill(null);
        setZoneSkill(null);
        setPendingTeam(null);
        return;
      } else {
        updateAction(pendingActionId, { startZone: zone, ...(coords ? { startX: coords.x, startY: coords.y } : {}) });
      }
      toast.success(`Zona ${zone} registrata`, { duration: 1200 });
    }
    setZoneSelectMode(false);
    setPendingActionId(null);
    setPendingSkill(null);
    setZoneSkill(null);
    setPendingTeam(null);
  };

  const skipZone = () => {
    setZoneSelectMode(false);
    setPendingActionId(null);
    setPendingSkill(null);
    setZoneSkill(null);
    setPendingTeam(null);
  };

  // Export DVW
  const handleExportDVW = () => {
    // Salvataggio forzato prima dell'esportazione: garantisce che l'ultima
    // versione dello scout sia persistita anche se non è ancora scattato
    // il modulo-5 dell'autosave.
    if (user) {
      upsertScoutSession(
        sessionIdRef.current, user.id,
        matchInfo, homeTeam, awayTeam, matchState,
      );
    }
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

  // Report PDF immediato da scout live
  const handleGenerateReportLive = async () => {
    const { homeTeamId, awayTeamId, actions, players, meta } = buildLiveReportInput(
      matchInfo, homeTeam, awayTeam, matchState, sessionIdRef.current,
    );
    const { downloadMatchReport, logReportGenerated } = await import('@/lib/pdfReport');
    downloadMatchReport(meta, actions, players);
    if (user && societyId) {
      try {
        await logReportGenerated(
          supabase, societyId, user.id,
          sessionIdRef.current, meta, 'live',
        );
      } catch { /* no-op */ }
    }
    toast.success('Report PDF generato');
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
    <div className="h-[calc(100dvh-3rem)] flex flex-col bg-background overflow-hidden">
      <FullscreenToggle />

      {/* HEADER: ScoreBoard */}
      <div className="shrink-0 px-2 pt-2">
        <ScoreBoard awayFirst={!homeOnLeft} />
      </div>

      {/* FOOTER FISSA skill+evaluation (SOLO MOBILE: su desktop il wizard è nel pannello laterale destro,
          avere anche LiveFooter qui duplicherebbe gli stessi comandi). */}
      <div className="md:hidden">
        <LiveKpiBanner actions={matchState.actions} currentSet={matchState.currentSet} />
        <LiveFooter
          selectedPlayer={selectedPlayer}
          selectedSkill={pendingSkill}
          mode={scoutingMode}
          suggestedSkill={selectedPlayer && suggestion?.team === selectedPlayer.team ? suggestion.skill : null}
          selectedAttackType={pendingAttackType}
          onAttackTypeSelect={setPendingAttackType}
          isMiddleBlocker={selectedPlayer ? isPlayerMiddleBlocker(selectedPlayer.number, selectedPlayer.team) : false}
          selectedPlayerZone={selectedPlayer ? computeZoneForPlayer(selectedPlayer.number, selectedPlayer.team) : null}
          selectedMiddleCombo={pendingMiddleCombo}
          onMiddleComboSelect={setPendingMiddleCombo}
          selectedOtherCombo={pendingOtherCombo}
          onOtherComboSelect={setPendingOtherCombo}
          onSkillSelect={(skill) => setPendingSkill(skill)}
          onEvaluationSelect={(evaluation) => {
            if (!selectedPlayer || !pendingSkill) return;
            const id = addAction({
              team: selectedPlayer.team,
              playerNumber: selectedPlayer.number,
              skill: pendingSkill,
              skillType: pendingSkill === 'A' ? pendingAttackType : 'H',
              evaluation,
              timestamp: '',
              code: '',
            });
            if (settings.autoPoint) {
              const winner = autoPointWinner(pendingSkill, evaluation, selectedPlayer.team);
              if (winner) addPoint(winner);
            }
            handleActionComplete(id, pendingSkill);
          }}
        />
      </div>


      {/* DESKTOP layout (≥ md) */}
      <div className="hidden md:flex flex-1 min-h-0 gap-1.5 p-1.5 overflow-hidden">
        {/* Colonna campi */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">

          {/* CSServePanel + banner suggerimento + toggle pulito */}
          <div className="flex items-center gap-2">
            <CSServePanel />
            <div className="flex-1" />
            {suggestion?.skill && suggestion.team && (
              <div className={`min-h-[44px] px-3 rounded-md border-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                suggestion.team === 'home'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400'
              }`}>
                <span>{SKILL_BANNER[suggestion.skill]}</span>
                <span>→</span>
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
            <button
              type="button"
              onClick={() => setShowLiveHeatmap((v) => !v)}
              className={cn(
                'min-h-[44px] px-3 rounded-md border-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95',
                showLiveHeatmap
                  ? 'bg-primary/20 border-primary text-orange-800 dark:text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
              )}
              title="Mostra/nascondi heatmap sul campo"
            >
              🔥 HEAT
            </button>
            {zoneSelectMode && (
              <button
                type="button"
                onClick={skipZone}
                className="min-h-[44px] px-3 rounded-md border-2 border-warning bg-warning/20 text-amber-900 dark:text-warning text-xs font-black uppercase tracking-wider active:scale-95"
              >
                Skip zona
              </button>
            )}
          </div>

          {/* Pannello filtri heatmap (visibile solo con HEAT attivo) */}
          {showLiveHeatmap && (
            <LiveHeatmapFilters
              homeTeam={homeTeam} awayTeam={awayTeam}
              skill={heatmapSkillFilter} setSkill={setHeatmapSkillFilter}
              team={heatmapTeamFilter} setTeam={setHeatmapTeamFilter}
              evaluation={heatmapEvalFilter} setEvaluation={setHeatmapEvalFilter}
              player={heatmapPlayerFilter} setPlayer={setHeatmapPlayerFilter}
            />
          )}

          {/* Campi affiancati */}
          <div className="flex-1 min-h-0 px-1 pt-4">
            <VolleyballCourt
              layout="split"
              swapSides={homeOnLeft}
              heatmapData={liveHeatmapData}
              heatmapColor={heatmapColor}
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
              onZoneClick={zoneSelectMode ? (z, t, p) => handleZoneSelect(z, t, p) : undefined}
              zoneSelectTeam={zoneSelectMode && pendingTeam ? pendingTeam : undefined}
              zoneSelectSkill={zoneSelectMode ? (zoneSkill ?? pendingSkill) : undefined}
            />
          </div>

          {/* Rally history */}
          <CSRallyHistory />
        </div>

        {/* Pannello laterale destro (più largo quando è aperta la heatmap) */}
        <div className={cn(
          'shrink-0 flex flex-col gap-1.5 min-h-0 transition-[width] duration-200',
          rightTab === 'heat' ? 'w-[380px]' : 'w-[280px]'
        )}>
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
                selectedAttackType={pendingAttackType}
                onAttackTypeSelect={setPendingAttackType}
                isMiddleBlocker={isPlayerMiddleBlocker(selectedPlayer.number, selectedPlayer.team)}
                selectedPlayerZone={computeZoneForPlayer(selectedPlayer.number, selectedPlayer.team)}
                selectedMiddleCombo={pendingMiddleCombo}
                onMiddleComboSelect={setPendingMiddleCombo}
                selectedOtherCombo={pendingOtherCombo}
                onOtherComboSelect={setPendingOtherCombo}
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
                    skillType: skillToUse === 'A' ? pendingAttackType : 'H',
                    evaluation,
                    timestamp: '',
                    code: '',
                  });
                  if (settings.autoPoint) {
                    const winner = autoPointWinner(skillToUse, evaluation, selectedPlayer.team);
                    if (winner) addPoint(winner);
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
              <div className="grid grid-cols-5 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50">
                {(['log', 'stats', 'heat', 'quick', 'kpi'] as const).map((t) => {
                  const active = rightTab === t;
                  const labels: Record<RightTab, string> = { log: 'Log', stats: 'Stats', heat: 'Heatmap', quick: 'Quick', kpi: 'KPI' };
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
                {rightTab === 'kpi' && (
                  <LiveKpiPanel
                    actions={matchState.actions}
                    homeTeamName={homeTeam?.name ?? 'Casa'}
                    awayTeamName={awayTeam?.name ?? 'Ospite'}
                    homeScore={matchState.homeScore}
                    awayScore={matchState.awayScore}
                    currentSet={matchState.currentSet}
                  />
                )}
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
            swapSides={homeOnLeft}
            heatmapData={liveHeatmapData}
            heatmapColor={heatmapColor}
            highlightTeam={suggestion?.team ?? null}
            highlightPlayerNumber={suggestion?.playerNumber ?? null}
            simplifiedView={simplified}
            onPlayerClick={handlePlayerClick}
            selectedPlayer={selectedPlayer}
            recentActionPlayer={recentActionPlayer}
            selectedZone={null}
            onZoneClick={zoneSelectMode ? (z, t, p) => handleZoneSelect(z, t, p) : undefined}
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
      <EndSetDialog
        open={endSetDialog}
        onOpenChange={setEndSetDialog}
        currentSet={matchState.currentSet}
        homeName={homeTeam.name || 'Casa'}
        awayName={awayTeam.name || 'Ospite'}
        homeScore={matchState.homeScore}
        awayScore={matchState.awayScore}
        onReport={handleGenerateReportLive}
        onConfirm={() => {
          // Salvataggio forzato a fine set: chiude in modo sicuro il set corrente su Supabase.
          if (user) {
            upsertScoutSession(sessionIdRef.current, user.id, matchInfo, homeTeam, awayTeam, matchState);
          }
          endSet(); setEndSetDialog(false);
        }}
      />

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
