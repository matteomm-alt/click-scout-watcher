import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

/**
 * Badge floating temporaneo: visibile solo se l'utente è loggato e NON è ancora super-admin.
 * Si nasconde automaticamente dopo la promozione.
 */
export function ClaimSuperAdminBadge() {
  const { user, isSuperAdmin, loading } = useAuth();

  if (loading || !user || isSuperAdmin) return null;

  return (
    <Link
      to="/claim-super-admin"
      className="fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold shadow-lg backdrop-blur-sm transition-all hover:scale-105"
      title="Promuoviti a super-admin con il secret"
    >
      <ShieldCheck className="w-4 h-4" />
      Diventa super-admin
    </Link>
  );
}
