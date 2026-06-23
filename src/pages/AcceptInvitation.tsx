import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Loader2, LogOut, ShieldCheck, Volleyball } from 'lucide-react';
import { ROLE_LABELS, type AppRole } from '@/lib/roles';

type InviteInfo = {
  id: string;
  email: string;
  invited_role: AppRole;
  society_id: string;
  society_name: string;
  expires_at: string;
  accepted_at: string | null;
  is_expired: boolean;
  is_accepted: boolean;
};

/**
 * Pagina dedicata all'accettazione di un invito a una società.
 * Mostra dettagli dell'invito, gestisce login/signup e accetta automaticamente
 * quando l'utente è già loggato con l'email corretta.
 */
export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refreshRoles, signOut } = useAuth();

  // Token dalla query string oppure dal localStorage (sopravvive a redirect/conferme email).
  const urlToken = searchParams.get('token') || searchParams.get('invite');
  const token = urlToken || (typeof window !== 'undefined' ? localStorage.getItem('pending_invite_token') : null);

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const acceptingRef = useRef(false);

  useEffect(() => {
    if (urlToken) localStorage.setItem('pending_invite_token', urlToken);
  }, [urlToken]);

  useEffect(() => {
    if (!token) {
      setInviteLoading(false);
      setInviteError('Token mancante. Verifica il link ricevuto.');
      return;
    }
    let cancelled = false;
    setInviteLoading(true);
    (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: InviteInfo[] | null; error: Error | null }>;
    })
      .rpc('get_invitation_by_token', { _token: token })
      .then(({ data, error }) => {
        if (cancelled) return;
        const invite = data?.[0];
        if (error || !invite) {
          setInviteError('Invito non valido. Controlla il link ricevuto.');
          return;
        }
        if (invite.is_accepted) {
          setInviteInfo(invite);
          setInviteError('Questo invito è già stato accettato.');
          return;
        }
        if (invite.is_expired) {
          setInviteInfo(invite);
          setInviteError('Questo invito è scaduto. Chiedi alla società di inviarti un nuovo link.');
          return;
        }
        setInviteInfo(invite);
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const emailMismatch = !!(user && inviteInfo && user.email?.toLowerCase() !== inviteInfo.email.toLowerCase());

  const acceptInvite = async () => {
    if (!token || acceptingRef.current || accepted) return;
    acceptingRef.current = true;
    setAccepting(true);
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ accepted_society_name: string; invited_role: AppRole }> | null; error: Error | null }>;
    }).rpc('accept_society_invitation', { _token: token });
    acceptingRef.current = false;
    setAccepting(false);

    if (error) {
      setInviteError(error.message || 'Impossibile accettare l’invito.');
      toast.error(error.message || 'Impossibile accettare l’invito.');
      return;
    }
    const result = data?.[0];
    setAccepted(true);
    localStorage.removeItem('pending_invite_token');
    await refreshRoles();
    toast.success(`Benvenuto in ${result?.accepted_society_name ?? 'società'} (${ROLE_LABELS[result?.invited_role ?? 'coach']})`);
    setTimeout(() => navigate('/', { replace: true }), 800);
  };

  // Auto-accetta se utente loggato + email corretta + invito valido
  useEffect(() => {
    if (authLoading || !user || !inviteInfo || inviteError || emailMismatch || accepted || accepting) return;
    acceptInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, inviteInfo, inviteError, emailMismatch]);

  // Helper per costruire la URL di auth preservando il token
  const authUrl = (mode: 'signin' | 'signup') =>
    `/auth?mode=${mode}&invite=${encodeURIComponent(token ?? '')}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Volleyball className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase italic tracking-tight">Invito società</h1>
            <p className="text-xs text-muted-foreground">Click & Scout</p>
          </div>
        </div>

        {inviteLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifica invito in corso…
          </div>
        )}

        {!inviteLoading && inviteError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p>{inviteError}</p>
              {inviteInfo && (
                <p className="text-xs text-muted-foreground">
                  Per: <span className="font-mono">{inviteInfo.email}</span>
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>Torna alla home</Button>
            </div>
          </div>
        )}

        {!inviteLoading && inviteInfo && !inviteError && (
          <>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Sei stato invitato in
              </p>
              <p className="text-lg font-black italic uppercase tracking-tight leading-tight">{inviteInfo.society_name}</p>
              <p className="text-xs text-muted-foreground">
                Ruolo: <span className="text-foreground font-semibold">{ROLE_LABELS[inviteInfo.invited_role]}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Email invitata: <span className="font-mono">{inviteInfo.email}</span>
              </p>
            </div>

            {/* Stato 1: utente non loggato */}
            {!authLoading && !user && (
              <div className="space-y-2">
                <p className="text-sm">Per accettare devi prima accedere o creare un account con l'email indicata.</p>
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to={authUrl('signup')}>Crea account</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={authUrl('signin')}>Accedi</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Stato 2: utente loggato, email diversa */}
            {user && emailMismatch && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm space-y-2">
                <p className="flex items-center gap-2 text-amber-600 font-medium">
                  <AlertCircle className="w-4 h-4" /> Email diversa
                </p>
                <p className="text-xs text-muted-foreground">
                  Sei loggato come <span className="font-mono">{user.email}</span> ma l'invito è per <span className="font-mono">{inviteInfo.email}</span>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => { await signOut(); }}
                  className="gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Esci e accedi con l'account giusto
                </Button>
              </div>
            )}

            {/* Stato 3: accettazione in corso o avvenuta */}
            {user && !emailMismatch && (accepting || accepted) && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm flex items-center gap-2 text-emerald-700">
                {accepted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Invito accettato. Reindirizzamento…
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Accettazione in corso…
                  </>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
