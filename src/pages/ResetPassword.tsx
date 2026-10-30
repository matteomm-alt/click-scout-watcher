import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Volleyball } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { PasswordForm } from '@/components/auth/PasswordForm';

/**
 * Destinazione del link "Password dimenticata?". Il client Supabase legge il token dall'indirizzo
 * e crea una sessione di recupero: qui l'utente sceglie la nuova password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const timer = setTimeout(() => setTimedOut(true), 6000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md p-8 space-y-6 glass">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-2">
            <Volleyball className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nuova password</h1>
          <p className="text-sm text-muted-foreground">Scegli la password con cui accederai a VolleyScout Pro.</p>
        </div>

        {ready ? (
          <PasswordForm onDone={() => navigate('/', { replace: true })} />
        ) : timedOut ? (
          <div className="text-sm text-center space-y-3">
            <p className="text-muted-foreground">
              Il link non è valido o è scaduto. Richiedine uno nuovo dalla pagina di accesso.
            </p>
            <Link to="/auth" className="text-primary font-bold hover:underline">Vai all’accesso</Link>
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground">Verifica del link in corso…</p>
        )}
      </Card>
    </div>
  );
}
