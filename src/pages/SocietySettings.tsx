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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Building2, UserPlus, Users, Trash2, Copy, Mail, ShieldCheck, ArrowUpCircle, ArrowDownCircle, Plus, Pencil, Shield } from 'lucide-react';
import { ROLE_LABELS, SOCIETY_ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';

interface SocietyRow {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  features: Record<string, unknown>;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: AppRole;
  full_name: string | null;
}

/** Converte un esadecimale (#RRGGBB) in formato HSL "h s% l%" usato dai design tokens. */
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

  // Form generale società
  const [societyName, setSocietyName] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryHex, setPrimaryHex] = useState('#3b82f6');
  const [accentHex, setAccentHex] = useState('#f59e0b');

  // Member management
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<{ id: string; email: string; role: AppRole; expires_at: string; token: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('coach');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // ── Squadre ──────────────────────────────────────────────
  interface TeamRow { id: string; name: string; category: string | null; age_group: string | null; season: string | null; notes: string | null; }
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [teamForm, setTeamForm] = useState({ name: '', category: '', age_group: '', season: '', notes: '' });
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  const loadTeams = async () => {
    if (!societyId) return;
    const { data, error } = await supabase.from('teams')
      .select('id, name, category, age_group, season, notes')
      .eq('society_id', societyId)
      .order('name');
    if (error) { toast.error('Errore caricamento squadre'); return; }
    setTeams((data ?? []) as TeamRow[]);
  };

  useEffect(() => { loadTeams(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [societyId]);

  const openTeamCreate = () => {
    setEditingTeam(null);
    setTeamForm({ name: '', category: '', age_group: '', season: '', notes: '' });
    setTeamDialogOpen(true);
  };
  const openTeamEdit = (t: TeamRow) => {
    setEditingTeam(t);
    setTeamForm({
      name: t.name,
      category: t.category ?? '',
      age_group: t.age_group ?? '',
      season: t.season ?? '',
      notes: t.notes ?? '',
    });
    setTeamDialogOpen(true);
  };
  const saveTeam = async () => {
    if (!societyId || !user || !teamForm.name.trim()) {
      toast.error('Nome squadra obbligatorio'); return;
    }
    const payload = {
      name: teamForm.name.trim(),
      category: teamForm.category.trim() || null,
      age_group: teamForm.age_group.trim() || null,
      season: teamForm.season.trim() || null,
      notes: teamForm.notes.trim() || null,
    };
    if (editingTeam) {
      const { error } = await supabase.from('teams').update(payload).eq('id', editingTeam.id);
      if (error) { toast.error(error.message || 'Errore salvataggio'); return; }
      toast.success('Squadra aggiornata');
    } else {
      const { error } = await supabase.from('teams').insert({ ...payload, society_id: societyId, coach_id: user.id });
      if (error) { toast.error(error.message || 'Errore creazione'); return; }
      toast.success('Squadra creata');
    }
    setTeamDialogOpen(false);
    await loadTeams();
  };
  const deleteTeam = async () => {
    if (!deleteTeamId) return;
    const { error } = await supabase.from('teams').delete().eq('id', deleteTeamId);
    if (error) { toast.error(error.message || 'Errore eliminazione'); return; }
    toast.success('Squadra eliminata');
    setDeleteTeamId(null);
    await loadTeams();
  };

  const loadMembers = async () => {
    if (!societyId) return;
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, user_id, role')
      .eq('society_id', societyId)
      .in('role', SOCIETY_ASSIGNABLE_ROLES);
    const userIds = (roles ?? []).map((r) => r.user_id);
    let profilesMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profilesMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    }
    setMembers((roles ?? []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role as AppRole,
      full_name: profilesMap.get(r.user_id) ?? null,
    })));
    const { data: inv } = await supabase
      .from('society_invitations')
      .select('id, email, role, expires_at, token')
      .eq('society_id', societyId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString());
    setInvitations((inv ?? []) as typeof invitations);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers(); }, [societyId]);

  const handleInvite = async () => {
    if (!societyId || !user || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Email non valida');
      return;
    }
    const { data, error } = await supabase
      .from('society_invitations')
      .insert({
        society_id: societyId,
        email,
        role: inviteRole,
        invited_by: user.id,
      })
      .select('token')
      .single();
    if (error || !data) {
      toast.error(error?.message ?? 'Errore creazione invito');
      return;
    }
    setGeneratedLink(`${window.location.origin}/accept-invitation?token=${data.token}`);
    setInviteEmail('');
    await loadMembers();
  };

  const removeMember = async (roleId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) toast.error(error.message || 'Errore rimozione');
    else { toast.success('Membro rimosso'); await loadMembers(); }
  };

  const changeMemberRole = async (m: MemberRow, newRole: AppRole) => {
    if (m.role === newRole) return;
    // delete the old role row then insert the new one (RLS scoped)
    const { error: delErr } = await supabase.from('user_roles').delete().eq('id', m.id);
    if (delErr) { toast.error(delErr.message); return; }
    const { error: insErr } = await supabase.from('user_roles').insert({
      user_id: m.user_id,
      society_id: societyId,
      role: newRole,
    });
    if (insErr) {
      toast.error(insErr.message);
      // rollback: re-insert old role
      await supabase.from('user_roles').insert({
        user_id: m.user_id,
        society_id: societyId,
        role: m.role,
      });
      return;
    }
    toast.success(`Ruolo aggiornato: ${ROLE_LABELS[newRole]}`);
    await loadMembers();
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase.from('society_invitations').delete().eq('id', id);
    if (error) toast.error('Errore revoca');
    else { toast.success('Invito revocato'); await loadMembers(); }
  };

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
        setSocietyName(row.name);
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

    const name = societyName.trim();
    if (!name) {
      toast.error('Il nome della società è obbligatorio');
      return;
    }

    const primaryHsl = hexToHslString(primaryHex);
    const accentHsl = hexToHslString(accentHex);
    if (!primaryHsl || !accentHsl) {
      toast.error('Formato colore non valido');
      return;
    }

    if (seasonStart && seasonEnd && seasonStart > seasonEnd) {
      toast.error('La data inizio deve precedere la data fine');
      return;
    }

    setSaving(true);
    try {
      const newFeatures = {
        ...(society.features ?? {}),
        season_start: seasonStart || null,
        season_end: seasonEnd || null,
      };

      const { error } = await supabase
        .from('societies')
        .update({
          name,
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
      const msg = e instanceof Error ? e.message : 'Errore durante il salvataggio';
      toast.error(msg);
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
          <CardTitle>Dati generali</CardTitle>
          <CardDescription>Nome visibile della società e periodo della stagione corrente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="society-name">Nome società</Label>
            <Input
              id="society-name"
              value={societyName}
              onChange={(e) => setSocietyName(e.target.value)}
              placeholder="Es. Volley Club Milano"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Membri società</CardTitle>
            <CardDescription>Invita admin, coach, scout e direttori tecnici. Puoi anche promuovere o degradare.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setInviteDialogOpen(true); setGeneratedLink(''); setInviteRole('coach'); }}>
            <UserPlus className="h-4 w-4 mr-2" /> Invita membro
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun membro associato.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.role === 'society_admin' ? (
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{m.full_name ?? 'Senza nome'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select value={m.role} onValueChange={(v) => changeMemberRole(m, v as AppRole)} disabled={m.user_id === user?.id}>
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIETY_ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={m.user_id === user?.id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rimuovere {ROLE_LABELS[m.role].toLowerCase()}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Il membro non potrà più accedere a questa società con questo ruolo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember(m.id)}>Rimuovi</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invitations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inviti pendenti</p>
              {invitations.map((inv) => {
                const link = `${window.location.origin}/accept-invitation?token=${inv.token}`;
                return (
                  <div key={inv.id} className="flex items-center justify-between border border-dashed border-border rounded-md px-3 py-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {inv.email}
                        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5">
                          {ROLE_LABELS[inv.role]}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scade il {new Date(inv.expires_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiato!'); }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copia link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeInvitation(inv.id)}
                    >
                      Revoca
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={(o) => { setInviteDialogOpen(o); if (!o) setGeneratedLink(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita un membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                placeholder="email@esempio.it"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Ruolo</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIETY_ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {generatedLink && (
              <div className="space-y-2 border border-primary/30 bg-primary/5 rounded-md p-3">
                <p className="text-xs text-muted-foreground">Copia questo link e mandalo al nuovo membro:</p>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="text-xs" />
                  <Button
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success('Link copiato!'); }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copia
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setInviteDialogOpen(false); setGeneratedLink(''); }}>Chiudi</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>Genera link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
