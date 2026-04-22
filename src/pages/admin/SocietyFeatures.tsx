import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building2, Loader2, Save, ToggleRight } from 'lucide-react';
import {
  FEATURE_DEFINITIONS,
  isFeatureEnabled,
  type FeaturesMap,
  type FeatureKey,
} from '@/lib/societyFeatures';
import { useActiveSociety } from '@/hooks/useActiveSociety';

export default function SocietyFeatures() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { refresh: refreshActiveSociety } = useActiveSociety();
  const { toast } = useToast();

  const [societyName, setSocietyName] = useState<string>('');
  const [societySlug, setSocietySlug] = useState<string>('');
  const [features, setFeatures] = useState<FeaturesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate('/', { replace: true });
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('societies')
        .select('name, slug, features')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        toast({ title: 'Errore caricamento', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      setSocietyName(data?.name ?? '');
      setSocietySlug(data?.slug ?? '');
      setFeatures((data?.features ?? {}) as FeaturesMap);
      setLoading(false);
    };
    if (isSuperAdmin) load();
  }, [id, isSuperAdmin, toast]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof FEATURE_DEFINITIONS>();
    FEATURE_DEFINITIONS.forEach((f) => {
      const arr = map.get(f.group) ?? [];
      arr.push(f);
      map.set(f.group, arr);
    });
    return Array.from(map.entries());
  }, []);

  const toggle = (key: FeatureKey, val: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: val }));
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from('societies')
      .update({ features: features as unknown as Record<string, unknown> })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Moduli aggiornati', description: societyName });
    await refreshActiveSociety();
  };

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="container py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="w-4 h-4" /> Torna alle società
        </Button>
        <Button onClick={save} disabled={saving || loading} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva moduli
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
          Super Admin · Moduli
        </p>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
          <Building2 className="w-9 h-9 text-primary" />
          {loading ? '…' : societyName}
        </h1>
        {societySlug && (
          <p className="text-xs font-mono text-muted-foreground mt-2">/societa/{societySlug}</p>
        )}
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          Attiva o disattiva i moduli disponibili per questa società. Le modifiche hanno effetto
          immediato per tutti i coach. Se un modulo non è mai stato impostato, è considerato attivo
          di default.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento moduli…
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([group, items]) => (
            <section key={group} className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold flex items-center gap-2">
                <ToggleRight className="w-3.5 h-3.5" /> {group}
              </h2>
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {items.map((f) => {
                  const active = isFeatureEnabled(features, f.key);
                  return (
                    <div
                      key={f.key}
                      className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`feat-${f.key}`}
                          className="font-bold uppercase italic tracking-tight text-sm cursor-pointer"
                        >
                          {f.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                          {f.key}
                        </p>
                      </div>
                      <Switch
                        id={`feat-${f.key}`}
                        checked={active}
                        onCheckedChange={(v) => toggle(f.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva moduli
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
