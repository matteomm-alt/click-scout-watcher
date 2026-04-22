import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Plus, UserPlus, Loader2, Mail, Copy, ExternalLink,
  ShieldCheck, CheckCircle2, Users, Trash2, UserCog, ToggleRight, Settings2,
} from 'lucide-react';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Switch } from '@/components/ui/switch';
import { FEATURE_DEFINITIONS, isFeatureEnabled, type FeaturesMap, type FeatureKey } from '@/lib/societyFeatures';

interface Society {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  features: FeaturesMap;
}

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  society_id: string;
  role: 'super_admin' | 'society_admin' | 'coach';
}

interface MyRole {
  society_id: string;
  role: 'super_admin' | 'society_admin' | 'coach';
}

interface CoachRow {
  role_id: string;
  user_id: string;
  society_id: string;
  full_name: string | null;
  email: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export default function AdminSocieties() {
  const { user, isSuperAdmin, loading: authLoading, refreshRoles } = useAuth();
  const { refresh: refreshActiveSociety } = useActiveSociety();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState<Society[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myRoles, setMyRoles] = useState<MyRole[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Dialog crea società
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);

  // Dialog invita admin / coach
  const [inviteFor, setInviteFor] = useState<Society | null>(null);
  const [inviteRole, setInviteRole] = useState<'society_admin' | 'coach'>('society_admin');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Conferma rimozione coach
  const [removeCoach, setRemoveCoach] = useState<CoachRow | null>(null);
  const [removing, setRemoving] = useState(false);

  // Toggle moduli inline (id società → in saving)
  const [savingFeatures, setSavingFeatures] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [
      { data: socs, error: sErr },
      { data: invs, error: iErr },
      { data: roles, error: rErr },
      { data: coachRoles, error: cErr },
    ] = await Promise.all([
      supabase.from('societies').select('id, name, slug, created_at, features').order('created_at', { ascending: false }),
      supabase.from('society_invitations').select('id, email, token, expires_at, accepted_at, society_id, role').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('society_id, role').eq('user_id', user.id),
      supabase.from('user_roles').select('id, user_id, society_id, role').eq('role', 'coach'),
    ]);
    if (sErr) toast({ title: 'Errore caricamento società', description: sErr.message, variant: 'destructive' });
    if (iErr) console.warn('inviti', iErr);
    if (rErr) console.warn('ruoli', rErr);
    if (cErr) console.warn('coach', cErr);

    const coachRolesArr = (coachRoles || []) as { id: string; user_id: string; society_id: string | null; role: string }[];
    const coachUserIds = Array.from(new Set(coachRolesArr.map((c) => c.user_id)));
    let profilesMap = new Map<string, { full_name: string | null }>();
    if (coachUserIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', coachUserIds);
      (profs || []).forEach((p) => profilesMap.set(p.id, { full_name: p.full_name }));
    }

    // Per email: usiamo gli inviti accettati per recuperare l'email originale del coach
    const acceptedInvitesByUser = new Map<string, string>();
    (invs || []).forEach((inv) => {
      if (inv.accepted_at && inv.role === 'coach') {
        // non abbiamo direttamente user_id sull'invito, ma possiamo correlare per email/profilo
      }
    });

    const coachesData: CoachRow[] = coachRolesArr
      .filter((c) => c.society_id)
      .map((c) => ({
        role_id: c.id,
        user_id: c.user_id,
        society_id: c.society_id as string,
        full_name: profilesMap.get(c.user_id)?.full_name ?? null,
        email: acceptedInvitesByUser.get(c.user_id) ?? null,
      }));

    setSocieties(((socs || []) as { id: string; name: string; slug: string; created_at: string; features: unknown }[]).map((s) => ({
      ...s,
      features: (s.features ?? {}) as FeaturesMap,
    })));
    setInvitations((invs || []) as Invitation[]);
    setMyRoles(
      ((roles || []) as { society_id: string | null; role: MyRole['role'] }[])
        .filter((r) => r.society_id)
        .map((r) => ({ society_id: r.society_id as string, role: r.role })),
    );
    setCoaches(coachesData);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, user?.id]);

  const isAdminOf = (societyId: string) =>
    myRoles.some((r) => r.society_id === societyId && r.role === 'society_admin');

  const claimSocietyAdmin = async (s: Society) => {
    if (!user) return;
    setClaimingId(s.id);
    const { error } = await supabase.from('user_roles').insert({
      user_id: user.id,
      society_id: s.id,
      role: 'society_admin',
    });
    setClaimingId(null);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Sei ora admin di', description: s.name });
    await refreshRoles();
    await refreshActiveSociety();
    load();
  };

  const openCreate = () => {
    setNewName('');
    setNewSlug('');
    setCreateOpen(true);
  };

  const handleNameChange = (v: string) => {
    setNewName(v);
    setNewSlug((prev) => (prev === '' || prev === slugify(newName) ? slugify(v) : prev));
  };

  const submitCreate = async () => {
    if (!user) return;
    const name = newName.trim();
    const slug = slugify(newSlug || newName);
    if (!name || !slug) {
      toast({ title: 'Nome e slug obbligatori', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase
      .from('societies')
      .insert({ name, slug, created_by: user.id })
      .select('id')
      .single();
    setCreating(false);
    if (error) {
      toast({ title: 'Errore creazione', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Società creata', description: name });
    setCreateOpen(false);
    load();
  };

  const openInvite = (s: Society, role: 'society_admin' | 'coach') => {
    setInviteFor(s);
    setInviteRole(role);
    setInviteEmail('');
  };

  const submitInvite = async () => {
    if (!inviteFor || !user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: 'Email non valida', variant: 'destructive' });
      return;
    }
    setInviting(true);
    const { error } = await supabase.from('society_invitations').insert({
      society_id: inviteFor.id,
      email,
      role: inviteRole,
      invited_by: user.id,
    });
    setInviting(false);
    if (error) {
      toast({ title: 'Errore invito', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Invito creato',
      description: `Condividi il link con ${email}`,
    });
    setInviteEmail('');
    setInviteFor(null);
    load();
  };

  const confirmRemoveCoach = async () => {
    if (!removeCoach) return;
    setRemoving(true);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', removeCoach.role_id);
    setRemoving(false);
    if (error) {
      toast({ title: 'Errore rimozione', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Coach rimosso' });
    setRemoveCoach(null);
    load();
  };

  const inviteLink = (token: string) =>
    `${window.location.origin}/auth?invite=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteLink(token));
    toast({ title: 'Link copiato' });
  };

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="container py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Super Admin</p>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight flex items-center gap-3">
            <Building2 className="w-9 h-9 text-primary" />
            Società
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Crea nuove società, invita admin e coach. Ogni società sarà poi gestita autonomamente dal proprio admin.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Nuova società
        </Button>
      </div>

      {/* Lista società */}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
        </div>
      ) : societies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-bold uppercase italic tracking-tight mb-1">Nessuna società</h3>
          <p className="text-sm text-muted-foreground mb-4">Crea la prima società per iniziare.</p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Crea società
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {societies.map((s) => {
            const socInvites = invitations.filter((i) => i.society_id === s.id);
            const pendingAdmin = socInvites.filter((i) => !i.accepted_at && i.role === 'society_admin');
            const pendingCoach = socInvites.filter((i) => !i.accepted_at && i.role === 'coach');
            const socCoaches = coaches.filter((c) => c.society_id === s.id);
            return (
              <article
                key={s.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black italic uppercase tracking-tight leading-tight truncate">{s.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{s.slug}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                      {socCoaches.length} coach
                    </Badge>
                    {(pendingAdmin.length + pendingCoach.length) > 0 && (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">
                        {pendingAdmin.length + pendingCoach.length} invito{(pendingAdmin.length + pendingCoach.length) === 1 ? '' : 'i'}
                      </Badge>
                    )}
                  </div>
                </header>

                {/* Lista coach attivi */}
                {socCoaches.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3" /> Coach attivi
                    </p>
                    {socCoaches.map((c) => (
                      <div
                        key={c.role_id}
                        className="flex items-center gap-2 text-xs bg-muted/40 border border-border rounded px-2 py-1.5"
                      >
                        <UserCog className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate flex-1" title={c.full_name || c.user_id}>
                          {c.full_name || <span className="font-mono text-muted-foreground">{c.user_id.slice(0, 8)}…</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRemoveCoach(c)}
                          className="text-destructive hover:underline inline-flex items-center gap-1 shrink-0"
                          title="Rimuovi coach"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inviti pendenti */}
                {(pendingAdmin.length + pendingCoach.length) > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Inviti in attesa
                    </p>
                    {[...pendingAdmin, ...pendingCoach].map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 text-xs bg-muted/40 border border-border rounded px-2 py-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 shrink-0 ${
                            inv.role === 'society_admin'
                              ? 'border-primary/40 text-primary'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          {inv.role === 'society_admin' ? 'admin' : 'coach'}
                        </Badge>
                        <span className="truncate flex-1" title={inv.email}>{inv.email}</span>
                        <button
                          type="button"
                          onClick={() => copyLink(inv.token)}
                          className="text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                          <Copy className="w-3 h-3" /> link
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <footer className="flex flex-col gap-2 mt-auto pt-2 border-t border-border/50">
                  {isAdminOf(s.id) ? (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold px-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sei admin di questa società
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 w-full"
                      onClick={() => claimSocietyAdmin(s)}
                      disabled={claimingId === s.id}
                    >
                      {claimingId === s.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Promozione…</>
                      ) : (
                        <><ShieldCheck className="w-3.5 h-3.5" /> Diventa admin</>
                      )}
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openInvite(s, 'society_admin')}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Admin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openInvite(s, 'coach')}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Coach
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 w-full"
                    onClick={() => navigate(`/societa/${s.slug}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Apri pagina società
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog crea società */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">Nuova società</DialogTitle>
            <DialogDescription>
              Verrà creata vuota. Potrai poi invitarne l'admin via email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome società *</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Es: Pallavolo Firenze"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug URL *</Label>
              <Input
                id="slug"
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder="pallavolo-firenze"
              />
              <p className="text-xs text-muted-foreground">
                Usato nelle URL: <span className="font-mono">/societa/{newSlug || 'slug'}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Annulla</Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creazione…</> : 'Crea società'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog invito admin / coach */}
      <Dialog open={!!inviteFor} onOpenChange={(o) => !o && setInviteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">
              Invita {inviteRole === 'society_admin' ? 'admin' : 'coach'}
            </DialogTitle>
            <DialogDescription>
              Invita un {inviteRole === 'society_admin' ? 'admin' : 'coach'} per <strong>{inviteFor?.name}</strong>.{' '}
              {inviteRole === 'society_admin'
                ? 'Riceverà accesso completo alla società.'
                : 'Potrà gestire atleti, allenamenti e analisi della società.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={inviteRole === 'society_admin' ? 'admin@esempio.it' : 'coach@esempio.it'}
              />
              <p className="text-xs text-muted-foreground">
                L'invito è valido 7 giorni. Dopo la creazione potrai copiare il link e condividerlo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteFor(null)} disabled={inviting}>Annulla</Button>
            <Button onClick={submitInvite} disabled={inviting}>
              {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creazione…</> : 'Crea invito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conferma rimozione coach */}
      <AlertDialog open={!!removeCoach} onOpenChange={(o) => !o && setRemoveCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere il coach?</AlertDialogTitle>
            <AlertDialogDescription>
              Il coach <strong>{removeCoach?.full_name || removeCoach?.user_id?.slice(0, 8)}</strong> perderà
              l'accesso a questa società. L'azione non cancella l'account utente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmRemoveCoach(); }}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rimozione…</> : 'Rimuovi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
