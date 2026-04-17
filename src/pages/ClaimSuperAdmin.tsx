import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ClaimSuperAdmin() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, refreshRoles, signOut } = useAuth();
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !secret) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('claim-super-admin', {
        body: { secret },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore sconosciuto');

      toast.success('Sei ora super-admin!');
      await refreshRoles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto';
      toast.error(`Promozione fallita: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md p-8 space-y-6 glass">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Claim Super-Admin</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci il secret di sistema per ottenere i privilegi di super-admin
            piattaforma.
          </p>
          {user && (
            <p className="text-xs text-muted-foreground pt-2">
              Loggato come <span className="text-foreground font-medium">{user.email}</span>
            </p>
          )}
        </div>

        {isSuperAdmin ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Sei già super-admin</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Puoi creare società e gestire la piattaforma.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Vai alla dashboard
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleClaim} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="secret">Secret di sistema</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Il valore di <code className="text-primary">SUPER_ADMIN_CLAIM_SECRET</code>{' '}
                  che hai impostato nei secrets di Lovable Cloud.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !secret}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Promuovimi a super-admin
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                className="hover:text-foreground"
              >
                Esci
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
