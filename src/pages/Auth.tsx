import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertCircle, Eye, EyeOff, Loader2, Volleyball } from 'lucide-react';

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Troppo corta', color: 'bg-destructive' },
    { label: 'Debole', color: 'bg-destructive' },
    { label: 'Discreta', color: 'bg-amber-500' },
    { label: 'Buona', color: 'bg-emerald-500' },
    { label: 'Ottima', color: 'bg-emerald-600' },
  ] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}

type Mode = 'signin' | 'signup';
type InviteInfo = {
  id: string;
  email: string;
  invited_role: 'super_admin' | 'society_admin' | 'coach';
  society_id: string;
  society_name: string;
  expires_at: string;
  accepted_at: string | null;
  is_expired: boolean;
  is_accepted: boolean;
};

const roleLabels: Record<InviteInfo['invited_role'], string> = {
  super_admin: 'Super Admin',
  society_admin: 'Admin società',
  coach: 'Coach',
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, refreshRoles, signOut } = useAuth();

  // Recupera l'invite token dalla URL oppure dal localStorage (per resistere a
  // conferme email aperte in browser/tab diversi che perdono il query string).
  const PENDING_INVITE_MAX_AGE_MS = 60 * 60 * 1000;
  const urlInviteToken = new URLSearchParams(location.search).get('invite');
  const storedInviteToken = (() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('pending_invite_token');
    const savedAt = Number(localStorage.getItem('pending_invite_saved_at') ?? '0');
    if (!raw || !savedAt || Date.now() - savedAt > PENDING_INVITE_MAX_AGE_MS) {
      localStorage.removeItem('pending_invite_token');
      localStorage.removeItem('pending_invite_saved_at');
      return null;
    }
    return raw;
  })();
  const inviteToken = urlInviteToken || storedInviteToken;
  useEffect(() => {
    if (urlInviteToken && typeof window !== 'undefined') {
      localStorage.setItem('pending_invite_token', urlInviteToken);
      localStorage.setItem('pending_invite_saved_at', String(Date.now()));
    }
  }, [urlInviteToken]);
  const [mode, setMode] = useState<Mode>(inviteToken ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const acceptingInviteRef = useRef(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Autofocus al primo campo utile al cambio modalità
    firstFieldRef.current?.focus();
  }, [mode]);

  const from = (location.state as { from?: string })?.from ?? '/';

  const emailMismatch =
    !!(user && inviteInfo && user.email?.toLowerCase() !== inviteInfo.email.toLowerCase());

  const acceptInvite = async (token: string) => {
    if (acceptingInviteRef.current || inviteAccepted) return false;
    acceptingInviteRef.current = true;
    setAcceptingInvite(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('accept_society_invitation', { _token: token });
    acceptingInviteRef.current = false;
    setAcceptingInvite(false);

    if (error) {
      setInviteError(error.message || 'Impossibile accettare l’invito.');
      toast.error(error.message || 'Impossibile accettare l’invito.');
      return false;
    }

    const accepted = Array.isArray(data) ? data[0] : data;
    setInviteAccepted(true);
    localStorage.removeItem('pending_invite_token');
    localStorage.removeItem('pending_invite_saved_at');
    await refreshRoles();
    toast.success(`Invito accettato: ${accepted?.accepted_society_name ?? 'società'} (${roleLabels[accepted?.invited_role as InviteInfo['invited_role']] ?? accepted?.invited_role})`);
    return true;
  };

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;
    setInviteLoading(true);
    setInviteError(null);
    setInviteAccepted(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc('get_invitation_by_token', { _token: inviteToken })
      .then(({ data, error }: { data: InviteInfo[] | null; error: Error | null }) => {
        if (cancelled) return;
        const invite = data?.[0];
        if (error || !invite) {
          setInviteError('Invito non valido. Controlla il link ricevuto.');
          setInviteInfo(null);
          return;
        }
        if (invite.is_accepted) {
          setInviteError('Questo invito è già stato accettato.');
          setInviteInfo(invite);
          return;
        }
        if (invite.is_expired) {
          setInviteError('Questo invito è scaduto. Chiedi alla società di inviarti un nuovo link.');
          setInviteInfo(invite);
          return;
        }
        setInviteInfo(invite);
        setEmail((current) => current || invite.email);
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  // Quando l'utente è loggato:
  //  - se c'è un invito pendente, lo mandiamo alla pagina dedicata di accettazione
  //  - altrimenti torna alla destinazione originaria
  useEffect(() => {
    if (authLoading || !user) return;
    if (inviteToken) {
      navigate(`/accept-invitation?token=${encodeURIComponent(inviteToken)}`, { replace: true });
      return;
    }
    navigate(from, { replace: true });
  
  }, [user, authLoading, inviteToken, navigate, from]);

  const translateAuthError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes('invalid login')) return 'Email o password errate.';
    if (m.includes('email not confirmed')) return 'Email non confermata. Controlla la casella di posta.';
    if (m.includes('user already registered')) return 'Esiste già un account con questa email. Prova ad accedere.';
    if (m.includes('password should be')) return 'Password troppo debole. Usa almeno 8 caratteri.';
    if (m.includes('rate limit')) return 'Troppi tentativi. Attendi qualche minuto e riprova.';
    if (m.includes('pwned') || m.includes('compromised')) return 'Questa password è stata compromessa in passato. Scegline un’altra.';
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password should be at least 8 characters');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: inviteToken
              ? `${window.location.origin}/accept-invitation?token=${encodeURIComponent(inviteToken)}`
              : window.location.origin,
            data: { full_name: fullName || email },
          },
        });
        if (error) throw error;
        if (inviteToken && data.session) {
          toast.success('Account creato. Accettazione invito in corso…');
        } else if (inviteToken) {
          toast.success('Account creato! Conferma l’email per completare l’ingresso nella società.');
        } else {
          toast.success('Account creato!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (inviteToken) {
          toast.success('Accesso effettuato. Accettazione invito in corso…');
        } else {
          toast.success('Login effettuato');
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Errore imprevisto';
      const msg = translateAuthError(raw);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md p-8 space-y-6 glass">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-2">
            <Volleyball className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VolleyScout Pro</h1>
          <p className="text-sm text-muted-foreground">
            {inviteToken ? 'Accedi o registrati per accettare l’invito' : mode === 'signin' ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        {inviteToken && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            {inviteLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifica invito in corso…
              </div>
            ) : emailMismatch && inviteInfo ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">Account non corrispondente</p>
                    <p className="text-xs text-muted-foreground">
                      Sei loggato come <span className="font-medium text-foreground">{user?.email}</span>,
                      ma questo invito è riservato a{' '}
                      <span className="font-medium text-foreground">{inviteInfo.email}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => { await signOut(); }}
                  className="w-full min-h-[44px] rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Esci e accedi con l'account giusto
                </button>
              </div>
            ) : inviteError ? (
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            ) : inviteInfo ? (
              <div className="space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">Invito società</p>
                <p>
                  Sei stato invitato a unirti a <span className="font-medium text-foreground">{inviteInfo.society_name}</span> come{' '}
                  <span className="font-medium text-foreground">{roleLabels[inviteInfo.invited_role]}</span>.
                </p>
                {acceptingInvite && <p className="text-primary">Accettazione invito in corso…</p>}
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                ref={firstFieldRef}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mario Rossi"
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              ref={mode === 'signin' ? firstFieldRef : undefined}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@esempio.it"
              required
              autoComplete="email"
              readOnly={!!(inviteToken && inviteInfo)}
              className={inviteToken && inviteInfo ? 'bg-muted/70 cursor-not-allowed opacity-80' : ''}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {capsLockOn && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                  Caps Lock attivo
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'))}
                onKeyDown={(e) => setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'))}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'signup' && password.length > 0 && (() => {
              const s = passwordStrength(password);
              return (
                <div className="space-y-1 pt-0.5">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i < s.score ? s.color : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Forza password: <span className="font-medium text-foreground">{s.label}</span>
                  </p>
                </div>
              );
            })()}
            {mode === 'signup' && password.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Minimo 8 caratteri. Le password compromesse verranno rifiutate.
              </p>
            )}
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || inviteLoading || (mode === 'signup' && Boolean(inviteError) && !inviteInfo?.is_accepted) || acceptingInvite}>
            {(submitting || acceptingInvite) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {acceptingInvite
              ? 'Accettazione invito…'
              : submitting
                ? (mode === 'signin' ? 'Accesso in corso…' : 'Creazione account…')
                : inviteToken
                  ? (mode === 'signin' ? 'Accedi e accetta invito' : 'Registrati e accetta invito')
                  : (mode === 'signin' ? 'Accedi' : 'Crea account')}
          </Button>

          {mode === 'signin' && !inviteToken && (
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error('Inserisci prima la tua email'); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/auth`,
                });
                if (error) toast.error(error.message);
                else toast.success('Email di recupero inviata. Controlla la casella.');
              }}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors block text-center w-full mt-1"
            >
              Password dimenticata?
            </button>
          )}
        </form>

        <div className="text-center text-sm">
          {mode === 'signin' ? (
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-primary hover:underline"
            >
              Non hai un account? Registrati
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-primary hover:underline"
            >
              Hai già un account? Accedi
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
