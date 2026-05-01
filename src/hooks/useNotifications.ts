import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationCounts {
  comunicazioni: number;
  presenze: number;
  convocazioni: number;
}

export function useNotifications(societyId: string | null, userId: string | null) {
  const [counts, setCounts] = useState<NotificationCounts>({
    comunicazioni: 0,
    presenze: 0,
    convocazioni: 0,
  });

  useEffect(() => {
    if (!societyId || !userId) {
      setCounts({ comunicazioni: 0, presenze: 0, convocazioni: 0 });
      return;
    }

    const load = async () => {
      try {
        // 1. Comunicazioni urgenti non lette dall'utente corrente
        const { data: comms } = await supabase
          .from('communications')
          .select('id, communication_reads(user_id)')
          .eq('society_id', societyId)
          .eq('is_urgent' as never, true);

        const comunNonLette =
          (comms ?? []).filter(
            (c: { communication_reads?: Array<{ user_id: string }> }) =>
              !c.communication_reads?.some((r) => r.user_id === userId)
          ).length || 0;

        // 2. Atleti sotto 70% presenze nell'ultimo mese
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: atts } = await supabase
          .from('attendances')
          .select('athlete_id, status')
          .eq('society_id', societyId)
          .gte('recorded_at', thirtyDaysAgo);

        const grouped = (atts ?? []).reduce<Record<string, { tot: number; pres: number }>>(
          (acc, a) => {
            const id = (a as { athlete_id: string }).athlete_id;
            if (!acc[id]) acc[id] = { tot: 0, pres: 0 };
            acc[id].tot++;
            if ((a as { status: string }).status === 'presente') acc[id].pres++;
            return acc;
          },
          {}
        );
        const atletiSotto = Object.values(grouped).filter(
          (v) => v.tot > 0 && v.pres / v.tot < 0.7
        ).length;

        // 3. Convocazioni create nelle ultime 48h
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { count: convCount } = await supabase
          .from('convocations')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', societyId)
          .gte('created_at', twoDaysAgo);

        setCounts({
          comunicazioni: comunNonLette,
          presenze: atletiSotto,
          convocazioni: convCount || 0,
        });
      } catch (err) {
        console.error('useNotifications load error', err);
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [societyId, userId]);

  return counts;
}
