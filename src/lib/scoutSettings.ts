import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ScoutSettings = {
  showServeType: boolean;
  showAttackCombo: boolean;
  showStartZone: boolean;
  showEndZone: boolean;
  // Distinta da showEndZone (usata per la Battuta): attiva la selezione
  // manuale opzionale del punto di caduta reale dell'Attacco nel campo
  // avversario, separata dalla posizione dell'attaccante (già usata per
  // la distribuzione del palleggiatore, non toccata da questa opzione).
  showAttackLandingZone: boolean;
  showAlzata: boolean;
  showDifesa: boolean;
  showFreeball: boolean;
  autoPoint: boolean;
  autoCorrelation: boolean;
  showMuroVincente: boolean;
  showMuroErrato: boolean;
  sostituzioniLibere: boolean;
  attaccoPredefinito: 'H' | 'M' | 'Q' | 'T' | 'U';
  ricezionePredefinita: '#' | '+' | '!' | '-' | '/' | '=';
  showAllDirections: boolean;
  posizionaPerRuolo: boolean;
  fastMode: boolean;
  followServe: boolean;
  singleTeamMode: boolean;
  singleTeamSide: 'home' | 'away';
  showServeStartZone: boolean;
  showRallyHistory: boolean;
  comboChain: boolean;
  keyboardShortcuts: boolean;
};

const STORAGE_KEY = 'scout_settings';

export const defaultScoutSettings: ScoutSettings = {
  showServeType: true,
  showAttackCombo: true,
  showStartZone: true,
  showEndZone: true,
  showAlzata: true,
  showDifesa: true,
  showFreeball: true,
  autoPoint: true,
  autoCorrelation: true,
  showMuroVincente: false,
  showMuroErrato: false,
  sostituzioniLibere: false,
  attaccoPredefinito: 'Q',
  ricezionePredefinita: '+',
  showAllDirections: true,
  posizionaPerRuolo: false,
  fastMode: false,
  followServe: false,
  singleTeamMode: false,
  singleTeamSide: 'home',
  showServeStartZone: false,
  showRallyHistory: true,
  comboChain: false,
  keyboardShortcuts: true,
};

export const SCOUT_PRESETS = {
  base: {
    showServeType: false,
    showAttackCombo: false,
    showStartZone: false,
    showEndZone: false,
    showAlzata: false,
    showDifesa: false,
    showFreeball: false,
    autoPoint: true,
    autoCorrelation: true,
    showMuroVincente: false,
    showMuroErrato: false,
    fastMode: true,
    followServe: true,
  } as Partial<ScoutSettings>,
  standard: {
    showServeType: true,
    showAttackCombo: false,
    showStartZone: true,
    showEndZone: true,
    showAlzata: true,
    showDifesa: true,
    showFreeball: false,
    autoPoint: true,
    autoCorrelation: true,
    showMuroVincente: false,
    showMuroErrato: false,
    fastMode: false,
    followServe: true,
  } as Partial<ScoutSettings>,
  avanzato: {
    showServeType: true,
    showAttackCombo: true,
    showStartZone: true,
    showEndZone: true,
    showAlzata: true,
    showDifesa: true,
    showFreeball: true,
    autoPoint: true,
    autoCorrelation: true,
    showMuroVincente: true,
    showMuroErrato: true,
    fastMode: false,
    followServe: false,
  } as Partial<ScoutSettings>,
} as const;

export type ScoutingMode = 'simple' | 'advanced' | 'custom';

export const MODE_PRESETS = {
  simple: {
    showAlzata: false, showDifesa: false, showFreeball: false,
    showServeType: false, showAttackCombo: false,
    showStartZone: false, showEndZone: false,
    fastMode: true, autoPoint: true,
  } as Partial<ScoutSettings>,
  advanced: {
    showAlzata: true, showDifesa: true, showFreeball: true,
    showServeType: true, showAttackCombo: true,
    showStartZone: true, showEndZone: true,
    fastMode: false, autoPoint: true,
  } as Partial<ScoutSettings>,
} as const;

export function getScoutingMode(s: ScoutSettings): ScoutingMode {
  if (!s.showAlzata && !s.showDifesa && !s.showFreeball) return 'simple';
  if (s.showAlzata && s.showDifesa && s.showFreeball) return 'advanced';
  return 'custom';
}

const readSettings = (): ScoutSettings => {
  if (typeof window === 'undefined') return defaultScoutSettings;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScoutSettings;
    return { ...defaultScoutSettings, ...JSON.parse(raw) };
  } catch {
    return defaultScoutSettings;
  }
};

export function useScoutSettings() {
  const [settings, setSettingsState] = useState<ScoutSettings>(readSettings);
  const cloudLoadedRef = useRef(false);
  const skipNextSyncRef = useRef(false);

  // Carica da Supabase al primo mount (override su localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('scout_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled || error) { cloudLoadedRef.current = true; return; }
      const cloud = (data?.scout_settings ?? null) as Partial<ScoutSettings> | null;
      if (cloud && Object.keys(cloud).length > 0) {
        skipNextSyncRef.current = true;
        setSettingsState((cur) => ({ ...cur, ...cloud }));
      }
      cloudLoadedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist locale + cloud
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (!cloudLoadedRef.current) return;
    if (skipNextSyncRef.current) { skipNextSyncRef.current = false; return; }
    const handle = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ scout_settings: settings as unknown as never }).eq('id', user.id);
    }, 600);
    return () => clearTimeout(handle);
  }, [settings]);

  const setSetting = <K extends keyof ScoutSettings>(key: K, value: ScoutSettings[K]) => {
    setSettingsState((current) => ({ ...current, [key]: value }));
  };

  const setSettings = (patch: Partial<ScoutSettings>) => {
    setSettingsState((current) => ({ ...current, ...patch }));
  };

  const resetSettings = () => setSettingsState(defaultScoutSettings);

  return { settings, setSetting, setSettings, resetSettings };
}
