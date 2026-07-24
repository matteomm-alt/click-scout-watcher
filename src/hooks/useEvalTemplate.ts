import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FONDAMENTALI_DEFAULT } from '@/lib/evalFondamentali';

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
  renamedFundamentals: Record<string, string>;
  fundamentalsOrder: string[] | null;
}

export const DEFAULT_TEMPLATE: EvalTemplate = {
  visibleFundamentals: null,
  customFundamentals: [],
  extraSubAspects: {},
  renamedSubAspects: {},
  renamedFundamentals: {},
  fundamentalsOrder: null,
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
        const rawRenamed = ((data as { renamed_sub_aspects?: unknown }).renamed_sub_aspects as
          Record<string, string>) ?? {};
        const renamedSubs: Record<string, string> = {};
        const renamedFonds: Record<string, string> = {};
        Object.entries(rawRenamed).forEach(([k, v]) => {
          if (k.startsWith('__fond__')) renamedFonds[k.replace('__fond__', '')] = v;
          else renamedSubs[k] = v;
        });

        const vf = data.visible_fundamentals ?? null;
        const allStdIds = FONDAMENTALI_DEFAULT.map(f => f.id);
        const isOrderOnly = !!vf
          && vf.length === allStdIds.length
          && allStdIds.every((id: string) => vf.includes(id));

        setTemplate({
          visibleFundamentals: isOrderOnly ? null : vf,
          customFundamentals: (data.custom_fundamentals as unknown as CustomFundamental[]) ?? [],
          extraSubAspects: (data.extra_sub_aspects as unknown as Record<string, string[]>) ?? {},
          renamedSubAspects: renamedSubs,
          renamedFundamentals: renamedFonds,
          fundamentalsOrder: isOrderOnly ? (vf as string[]) : null,
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
    const mergedRenamed = {
      ...next.renamedSubAspects,
      ...Object.fromEntries(
        Object.entries(next.renamedFundamentals)
          .map(([k, v]) => [`__fond__${k}`, v])
      ),
    };
    const visibleToSave = next.fundamentalsOrder ?? next.visibleFundamentals;
    await supabase
      .from('coach_eval_templates')
      .upsert({
        coach_id: user.id,
        visible_fundamentals: visibleToSave,
        custom_fundamentals: next.customFundamentals as never,
        extra_sub_aspects: next.extraSubAspects as never,
        renamed_sub_aspects: mergedRenamed as never,
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
