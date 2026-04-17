import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveSocietyInfo {
  societyId: string | null;
  societyName: string | null;
  /** true se l'utente è society_admin per questa società o super_admin */
  isAdmin: boolean;
  /** Date stagione (ISO yyyy-mm-dd) salvate in features JSONB */
  seasonStart: string | null;
  seasonEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

interface SocietyFeatures {
  season_start?: string;
  season_end?: string;
  [k: string]: unknown;
}

/**
 * Recupera la PRIMA società del coach (un coach appartiene a una sola società)
 * + il flag se è admin di quella società o super_admin.
 * Espone anche le date di stagione salvate in `societies.features`.
 */
export function useActiveSociety(): ActiveSocietyInfo {
  const { user, roles, isSuperAdmin } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState<string | null>(null);
  const [seasonStart, setSeasonStart] = useState<string | null>(null);
  const [seasonEnd, setSeasonEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // La prima società tra i ruoli che hanno society_id
  const candidate = roles.find((r) => r.society_id)?.society_id ?? null;
  const isAdminForSociety =
    isSuperAdmin ||
    roles.some((r) => r.society_id === candidate && r.role === 'society_admin');

  const load = async () => {
    if (!user || !candidate) {
      setSocietyId(null);
      setSocietyName(null);
      setSeasonStart(null);
      setSeasonEnd(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('societies')
      .select('id, name, features')
      .eq('id', candidate)
      .maybeSingle();

    if (error) {
      console.error('useActiveSociety load error', error);
    }
    setSocietyId(data?.id ?? null);
    setSocietyName(data?.name ?? null);
    const feats = (data?.features ?? {}) as SocietyFeatures;
    setSeasonStart(feats.season_start ?? null);
    setSeasonEnd(feats.season_end ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, candidate]);

  return {
    societyId,
    societyName,
    isAdmin: isAdminForSociety,
    seasonStart,
    seasonEnd,
    loading,
    refresh: load,
  };
}
