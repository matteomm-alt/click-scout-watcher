import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

// Wrapper tipizzato per l'API beta supabase.auth.oauth
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationResult | null; error: { message: string } | null }>;
};

interface AuthorizationDetails {
  client?: { name?: string; logo_uri?: string; client_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
}

interface AuthorizationResult {
  redirect_url?: string;
  redirect_to?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const oauthApi = ((supabase.auth as any).oauth ?? null) as OAuthApi | null;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Richiesta di autorizzazione mancante.");
        return;
      }
      if (!oauthApi) {
        setError("Il server di autorizzazione OAuth non è ancora disponibile in questa build.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    if (!oauthApi) return;
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Il server di autorizzazione non ha fornito un URL di redirect.");
      return;
    }
    window.location.href = target;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md p-8 space-y-6 glass">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Autorizza collegamento</h1>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !details ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento…
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {details.client?.name ?? "Un'applicazione esterna"}
              </span>{" "}
              chiede di collegarsi al tuo account VolleyScout Pro per usare l'app come te.
              Potrà leggere solo i dati a cui hai già accesso.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
                Rifiuta
              </Button>
              <Button disabled={busy} onClick={() => decide(true)}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Autorizza
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
