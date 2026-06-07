import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ReceptionFormations } from '@/lib/receptionFormations';

export interface FormationTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: 'reception' | 'attack' | 'both';
  reception_formations: ReceptionFormations | null;
  attack_formations: ReceptionFormations | null;
  created_at: string;
}

export function useFormationTemplates() {
  const { societyId } = useActiveSociety();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FormationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!societyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('formation_templates')
      .select('id, name, description, template_type, reception_formations, attack_formations, created_at')
      .eq('society_id', societyId)
      .order('name');
    setLoading(false);
    if (error) { toast.error('Errore caricamento template'); return; }
    setTemplates((data ?? []) as unknown as FormationTemplate[]);
  }, [societyId]);

  useEffect(() => { load(); }, [load]);

  const saveTemplate = async ({
    name,
    description,
    templateType,
    receptionFormations,
    attackFormations,
  }: {
    name: string;
    description?: string;
    templateType: 'reception' | 'attack' | 'both';
    receptionFormations?: ReceptionFormations | null;
    attackFormations?: ReceptionFormations | null;
  }) => {
    if (!societyId || !user || !name.trim()) return null;
    setSaving(true);
    const { data, error } = await supabase
      .from('formation_templates')
      .insert({
        society_id: societyId,
        created_by: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        template_type: templateType,
        reception_formations: (receptionFormations ?? null) as never,
        attack_formations: (attackFormations ?? null) as never,
      })
      .select('id')
      .single();
    setSaving(false);
    if (error) { toast.error('Errore salvataggio template'); return null; }
    toast.success(`Template "${name}" salvato`);
    await load();
    return data?.id ?? null;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('formation_templates')
      .delete()
      .eq('id', id);
    if (error) { toast.error('Errore eliminazione template'); return; }
    toast.success('Template eliminato');
    await load();
  };

  return { templates, loading, saving, saveTemplate, deleteTemplate, reload: load };
}
