import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin }: ProtectedRouteProps) {
  const { user, loading, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) {
      setOnboarded(null);
      return;
    }
    setChecking(true);
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .maybeSingle();
      setOnboarded(((data as { onboarded?: boolean } | null)?.onboarded ?? false));
      setChecking(false);
    })();
  }, [user]);

  if (loading || (user && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Redirect a onboarding se l'utente non l'ha completato (eccetto se è già lì o claim super admin)
  if (
    onboarded === false &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/claim-super-admin'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
