import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Save, Upload, Building2, UserPlus, Users, Trash2, Copy, Mail } from 'lucide-react';

interface SocietyRow {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  features: Record<string, unknown>;
}

/**
 * Converte un esadecimale (#RRGGBB) in formato HSL "h s% l%" usato dai design tokens.
 */
function hexToHslString(hex: string): string | null {
  const m = hex.trim().match(/^#?([a-f\d]{6})$/i);
  if (!m) return null;
  const intVal = parseInt(m[1], 16);
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Converte una stringa HSL "h s% l%" in #RRGGBB per popolare il color picker.
 */
function hslStringToHex(hsl: string): string {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return '#3b82f6';
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function SocietySettings() {
  const { user } = useAuth();
  const { societyId, isAdmin, loading: loadingSociety, refresh } = useActiveSociety();
  const [society, setSociety] = useState<SocietyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryHex, setPrimaryHex] = useState('#3b82f6');
  const [accentHex, setAccentHex] = useState('#f59e0b');

  useEffect(() => {
    if (!societyId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('societies')
        .select('id, name, logo_url, primary_color, accent_color, features')
        .eq('id', societyId)
        .maybeSingle();
      if (error) {
        toast.error('Errore caricamento società');
        console.error(error);
      } else if (data) {
        const row = data as SocietyRow;
        setSociety(row);
        const feats = (row.features ?? {}) as { season_start?: string; season_end?: string };
        setSeasonStart(feats.season_start ?? '');
        setSeasonEnd(feats.season_end ?? '');
        setLogoUrl(row.logo_url ?? '');
        setPrimaryHex(hslStringToHex(row.primary_color));
        setAccentHex(hslStringToHex(row.accent_color));
      }
      setLoading(false);
    })();
  }, [societyId]);

  // Guards
  if (loadingSociety || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!societyId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessuna società associata al tuo account.
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleLogoUpload = async (file: File) => {
    if (!societyId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${societyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('society-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('society-assets').getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast.success('Logo caricato. Ricorda di salvare le modifiche.');
    } catch (e) {
      console.error(e);
      toast.error('Upload logo fallito');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!societyId || !society) return;

    const primaryHsl = hexToHslString(primaryHex);
    const accentHsl = hexToHslString(accentHex);
    if (!primaryHsl || !accentHsl) {
      toast.error('Formato colore non valido');
      return;
    }

    // Validazione date
    if (seasonStart && seasonEnd && seasonStart > seasonEnd) {
      toast.error('La data inizio deve precedere la data fine');
      return;
    }

    setSaving(true);
    try {
      // Merge features preservando i flag dei moduli (gestiti dal super_admin)
      const newFeatures = {
        ...(society.features ?? {}),
        season_start: seasonStart || null,
        season_end: seasonEnd || null,
      };

      const { error } = await supabase
        .from('societies')
        .update({
          logo_url: logoUrl || null,
          primary_color: primaryHsl,
          accent_color: accentHsl,
          features: newFeatures,
        })
        .eq('id', societyId);

      if (error) throw error;
      toast.success('Impostazioni salvate');
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Impostazioni società</h1>
          <p className="text-sm text-muted-foreground">{society?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stagione</CardTitle>
          <CardDescription>Definisce il periodo della stagione corrente.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="season-start">Inizio stagione</Label>
            <Input
              id="season-start"
              type="date"
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="season-end">Fine stagione</Label>
            <Input
              id="season-end"
              type="date"
              value={seasonEnd}
              onChange={(e) => setSeasonEnd(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo società</CardTitle>
          <CardDescription>Caricato o specificato tramite URL pubblico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo società" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="logo-upload" className="block">Carica file</Label>
              <div className="flex gap-2">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin self-center" />}
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="logo-url">Oppure URL diretto</Label>
            <Input
              id="logo-url"
              type="url"
              placeholder="https://…/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colori brand</CardTitle>
          <CardDescription>Colore primario e di accento della società.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Colore primario</Label>
            <div className="flex gap-2 items-center">
              <input
                id="primary-color"
                type="color"
                value={primaryHex}
                onChange={(e) => setPrimaryHex(e.target.value)}
                className="h-10 w-14 rounded border cursor-pointer bg-background"
              />
              <Input
                value={primaryHex}
                onChange={(e) => setPrimaryHex(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Colore accento</Label>
            <div className="flex gap-2 items-center">
              <input
                id="accent-color"
                type="color"
                value={accentHex}
                onChange={(e) => setAccentHex(e.target.value)}
                className="h-10 w-14 rounded border cursor-pointer bg-background"
              />
              <Input
                value={accentHex}
                onChange={(e) => setAccentHex(e.target.value)}
                placeholder="#f59e0b"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salva impostazioni
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        I moduli attivi della società sono gestiti dal super amministratore.
      </p>
    </div>
  );
}
