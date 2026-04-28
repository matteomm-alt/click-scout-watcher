import { useEffect, useState } from 'react';

export type ScoutSettings = {
  showServeType: boolean;
  showAttackCombo: boolean;
  showStartZone: boolean;
  showEndZone: boolean;
  showAlzata: boolean;
  showDifesa: boolean;
  showFreeball: boolean;
  autoPoint: boolean;
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
};

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
