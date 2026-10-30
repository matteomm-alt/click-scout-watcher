import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

/**
 * Badge floating temporaneo: visibile solo se l'utente è loggato e NON è ancora super-admin.
 * Si nasconde automaticamente dopo la promozione.
 */
export function ClaimSuperAdminBadge() {
  const { user, isSuperAdmin, loading } = useAuth();
  const { pathname } = useLocation();

  // In Scout Live copriva i pulsanti di fine set / DVW: lì non deve comparire.
  if (loading || !user || isSuperAdmin || pathname.startsWith('/scout')) return null;

  return (
    <Link
      to="/claim-super-admin"
      className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold shadow-lg backdrop-blur-sm transition-all hover:scale-105"
      title="Promuoviti a super-admin con il secret"
    >
      <ShieldCheck className="w-4 h-4" />
      Diventa super-admin
    </Link>
  );
}
