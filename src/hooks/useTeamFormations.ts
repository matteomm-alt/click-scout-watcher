import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { parseRotationBase, isRotationComplete, type RotationBase } from '@/lib/teamRotations';
import type { ReceptionFormations } from '@/lib/receptionFormations';

export interface TeamFormationOption {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  isDefault: boolean;
  base: RotationBase;
  receptionFormations: ReceptionFormations | null;
  attackFormations: ReceptionFormations | null;
}

/** Formazioni di squadra (rotazioni predefinite) della società attiva. */
export function useTeamFormations() {
  const { societyId } = useActiveSociety();
  const [formations, setFormations] = useState<TeamFormationOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('formation_templates')
      .select('id, name, is_default, rotations, team_id, reception_formations, attack_formations, teams:team_id(name)')
      .eq('society_id', societyId)
      .not('team_id', 'is', null)
      .order('name');
    setLoading(false);
    if (error) return;
    const rows = (data ?? []).flatMap((r) => {
      const base = parseRotationBase((r as { rotations?: unknown }).rotations);
      if (!base || !isRotationComplete(base)) return [];
      const teamRel = (r as { teams?: { name?: string } | null }).teams;
      return [{
        id: r.id as string,
        name: r.name as string,
        teamId: (r as { team_id: string }).team_id,
        teamName: teamRel?.name ?? 'Squadra',
        isDefault: Boolean((r as { is_default?: boolean }).is_default),
        base,
        receptionFormations: ((r as { reception_formations?: unknown }).reception_formations ?? null) as ReceptionFormations | null,
        attackFormations: ((r as { attack_formations?: unknown }).attack_formations ?? null) as ReceptionFormations | null,
      } satisfies TeamFormationOption];
    });
    setFormations(rows);
  }, [societyId]);

  useEffect(() => { load(); }, [load]);

  return { formations, loading, reload: load };
}
