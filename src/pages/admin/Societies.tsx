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
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, UserPlus, Loader2, Mail, Copy, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useActiveSociety } from '@/hooks/useActiveSociety';

interface Society {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  society_id: string;
}

interface MyRole {
  society_id: string;
  role: 'super_admin' | 'society_admin' | 'coach';
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export default function AdminSocieties() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState<Society[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog crea società
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);

  // Dialog invita admin
  const [inviteFor, setInviteFor] = useState<Society | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data: socs, error: sErr }, { data: invs, error: iErr }] = await Promise.all([
      supabase.from('societies').select('id, name, slug, created_at').order('created_at', { ascending: false }),
      supabase.from('society_invitations').select('id, email, token, expires_at, accepted_at, society_id').order('created_at', { ascending: false }),
    ]);
    if (sErr) toast({ title: 'Errore caricamento società', description: sErr.message, variant: 'destructive' });
    if (iErr) console.warn('inviti', iErr);
    setSocieties((socs || []) as Society[]);
    setInvitations((invs || []) as Invitation[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const openCreate = () => {
    setNewName('');
    setNewSlug('');
    setCreateOpen(true);
  };

  const handleNameChange = (v: string) => {
    setNewName(v);
    // auto-slug se l'utente non l'ha toccato manualmente
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
    const { data, error } = await supabase
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
      role: 'society_admin',
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
            Crea nuove società e invita i loro admin. Ogni società sarà poi gestita autonomamente dal proprio admin.
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
            const pending = socInvites.filter((i) => !i.accepted_at);
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
                  <Badge variant="outline" className="border-primary/30 text-primary shrink-0">
                    {pending.length} invito{pending.length === 1 ? '' : 'i'}
                  </Badge>
                </header>

                {pending.length > 0 && (
                  <div className="space-y-1.5">
                    {pending.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 text-xs bg-muted/40 border border-border rounded px-2 py-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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

                <footer className="flex gap-2 mt-auto pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 flex-1"
                    onClick={() => setInviteFor(s)}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invita admin
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => navigate(`/societa/${s.slug}`)}
                    title="Apri pagina società"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Dialog invito admin */}
      <Dialog open={!!inviteFor} onOpenChange={(o) => !o && setInviteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tight">
              Invita admin
            </DialogTitle>
            <DialogDescription>
              Invita un admin per <strong>{inviteFor?.name}</strong>. Riceverà accesso completo alla società.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="email">Email admin *</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@esempio.it"
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
    </div>
  );
}
