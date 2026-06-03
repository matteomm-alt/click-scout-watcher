import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomFundamental {
  id: string;
  nome: string;
  subAspetti: string[];
}

export interface EvalTemplate {
  visibleFundamentals: string[] | null;
  customFundamentals: CustomFundamental[];
  extraSubAspects: Record<string, string[]>;
  renamedSubAspects: Record<string, string>;
}

export const DEFAULT_TEMPLATE: EvalTemplate = {
  visibleFundamentals: null,
  customFundamentals: [],
  extraSubAspects: {},
  renamedSubAspects: {},
};

export function useEvalTemplate() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<EvalTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('coach_eval_templates')
        .select('visible_fundamentals, custom_fundamentals, extra_sub_aspects, renamed_sub_aspects')
        .eq('coach_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setTemplate({
          visibleFundamentals: data.visible_fundamentals ?? null,
          customFundamentals: (data.custom_fundamentals as unknown as CustomFundamental[]) ?? [],
          extraSubAspects: (data.extra_sub_aspects as unknown as Record<string, string[]>) ?? {},
          renamedSubAspects: ((data as { renamed_sub_aspects?: unknown }).renamed_sub_aspects as Record<string, string>) ?? {},
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const save = useCallback(async (patch: Partial<EvalTemplate>) => {
    if (!user?.id) return;
    setSaving(true);
    const next = { ...template, ...patch };
    setTemplate(next);
    await supabase
      .from('coach_eval_templates')
      .upsert({
        coach_id: user.id,
        visible_fundamentals: next.visibleFundamentals,
        custom_fundamentals: next.customFundamentals as never,
        extra_sub_aspects: next.extraSubAspects as never,
        renamed_sub_aspects: next.renamedSubAspects as never,
      }, { onConflict: 'coach_id' });
    setSaving(false);
  }, [user?.id, template]);

  const reset = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setTemplate(DEFAULT_TEMPLATE);
    await supabase
      .from('coach_eval_templates')
      .delete()
      .eq('coach_id', user.id);
    setSaving(false);
  }, [user?.id]);

  return { template, loading, saving, save, reset };
}
