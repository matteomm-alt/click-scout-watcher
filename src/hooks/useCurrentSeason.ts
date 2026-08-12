import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from './useActiveSociety';

const STORAGE_KEY = 'current_season_v1';

export function calcCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}/${String(year + 1).slice(2)}`;
  return `${year - 1}/${String(year).slice(2)}`;
}

/** Range date ISO (yyyy-mm-dd) di una stagione "2025/26" → 2025-09-01 .. 2026-08-31 */
export function seasonRange(season: string): { from: string; to: string } {
  const startYear = parseInt(season.split('/')[0], 10);
  if (Number.isNaN(startYear)) {
    const fallback = parseInt(calcCurrentSeason().split('/')[0], 10);
    return { from: `${fallback}-09-01`, to: `${fallback + 1}-08-31` };
  }
  return { from: `${startYear}-09-01`, to: `${startYear + 1}-08-31` };
}

export function useCurrentSeason() {
  const { societyId } = useActiveSociety();

  const [currentSeason, setCurrentSeasonState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || calcCurrentSeason();
    } catch {
      return calcCurrentSeason();
    }
  });

  const [availableSeasons, setAvailableSeasons] = useState<string[]>([calcCurrentSeason()]);

  useEffect(() => {
    if (!societyId) return;
    let cancelled = false;
    Promise.all([
      supabase.from('trainings').select('season').eq('society_id', societyId).not('season', 'is', null),
      supabase.from('events').select('season').eq('society_id', societyId).not('season', 'is', null),
    ]).then(([tr, ev]) => {
      if (cancelled) return;
      const seasons = new Set<string>();
      seasons.add(calcCurrentSeason());
      seasons.add(currentSeason);
      (tr.data ?? []).forEach((r) => { if (r.season) seasons.add(r.season); });
      (ev.data ?? []).forEach((r) => { if (r.season) seasons.add(r.season); });
      setAvailableSeasons(Array.from(seasons).sort().reverse());
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  const setCurrentSeason = (season: string) => {
    setCurrentSeasonState(season);
    try { localStorage.setItem(STORAGE_KEY, season); } catch { /* storage non disponibile */ }
  };

  return { currentSeason, setCurrentSeason, availableSeasons, calcCurrentSeason, seasonRange };
}
