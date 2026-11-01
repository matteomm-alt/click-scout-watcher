import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import AppLayout from "@/components/AppLayout";
import Home from "./pages/Home.tsx";
const Index = lazy(() => import("./pages/Index.tsx"));
const ImportDvw = lazy(() => import("./pages/ImportDvw.tsx"));
const MatchAnalysisMulti = lazy(() => import("./pages/MatchAnalysisMulti.tsx"));
const Archive = lazy(() => import("./pages/Archive.tsx"));
import Auth from "./pages/Auth.tsx";
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation.tsx"));
const ClaimSuperAdmin = lazy(() => import("./pages/ClaimSuperAdmin.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
import NotFound from "./pages/NotFound.tsx";
const AnalisiPubblica = lazy(() => import("./pages/AnalisiPubblica.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));

// Gestionale
const Calendario = lazy(() => import("./pages/gestionale/Calendario.tsx"));
const Presenze = lazy(() => import("./pages/gestionale/Presenze.tsx"));
const Scadenze = lazy(() => import("./pages/gestionale/Scadenze.tsx"));
const Convocazioni = lazy(() => import("./pages/gestionale/Convocazioni.tsx"));
const Comunicazioni = lazy(() => import("./pages/gestionale/Comunicazioni.tsx"));
const Magazzino = lazy(() => import("./pages/gestionale/Magazzino.tsx"));

// Coaching (alcune lazy)
const Scheletri = lazy(() => import("./pages/coaching/Scheletri.tsx"));
const Schemi = lazy(() => import("./pages/coaching/Schemi.tsx"));
const Obiettivi = lazy(() => import("./pages/coaching/Obiettivi.tsx"));

// Analisi
const ReportStagione = lazy(() => import("./pages/analisi/ReportStagione.tsx"));
const ProfiloAvversario = lazy(() => import("./pages/analisi/ProfiloAvversario.tsx"));

// Atleta
const Atleti = lazy(() => import("./pages/atleta/Atleti.tsx"));
const Valutazioni = lazy(() => import("./pages/atleta/Valutazioni.tsx"));
const Inventario = lazy(() => import("./pages/atleta/Inventario.tsx"));
const Infortuni = lazy(() => import("./pages/atleta/Infortuni.tsx"));

// Admin
const SocietyFeatures = lazy(() => import("./pages/admin/SocietyFeatures.tsx"));
const SocietySettings = lazy(() => import("./pages/SocietySettings.tsx"));
const Personalizza = lazy(() => import("./pages/Personalizza.tsx"));

// Lazy-loaded heavy routes (bundle splitting)
const MatchAnalysis = lazy(() => import("./pages/MatchAnalysis.tsx"));
const Allenamenti = lazy(() => import("./pages/coaching/Allenamenti.tsx"));
const AllenamentoDetail = lazy(() => import("./pages/coaching/AllenamentoDetail.tsx"));
const Volume = lazy(() => import("./pages/coaching/Volume.tsx"));
const GuidaTecnica = lazy(() => import("./pages/coaching/GuidaTecnica.tsx"));
const Esercizi = lazy(() => import("./pages/coaching/Esercizi.tsx"));
const ProgrammazioneStagionale = lazy(() => import("./pages/coaching/ProgrammazioneStagionale.tsx"));
const AdminSocieties = lazy(() => import("./pages/admin/Societies.tsx"));
const AtletaDetail = lazy(() => import("./pages/atleta/AtletaDetail.tsx"));
const TeamsHub = lazy(() => import("./pages/TeamsHub.tsx"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard.tsx"));
const ImportDati = lazy(() => import("./pages/ImportDati.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : 'Operazione fallita';
        toast.error(msg);
      },
    },
  },
});

function PageSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function UpdateNotifier() {
  useEffect(() => {
    const onReady = () =>
      toast("Nuova versione disponibile", {
        description: "Aggiorna quando hai finito: i dati dello scout in corso restano salvati.",
        duration: Infinity,
        action: { label: "Aggiorna", onClick: () => window.location.reload() },
      });
    // Dopo un deploy un chunk lazy puo' non esistere piu': ricarica una volta sola.
    const onChunkError = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason && (e.reason.message || e.reason)) || "");
      if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) {
        if (!sessionStorage.getItem("chunk-reload")) {
          sessionStorage.setItem("chunk-reload", "1");
          window.location.reload();
        }
      }
    };
    window.addEventListener("app-update-ready", onReady);
    window.addEventListener("unhandledrejection", onChunkError);
    return () => {
      window.removeEventListener("app-update-ready", onReady);
      window.removeEventListener("unhandledrejection", onChunkError);
    };
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdateNotifier />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/claim-super-admin" element={<ProtectedRoute><ClaimSuperAdmin /></ProtectedRoute>} />
                <Route path="/analisi-pubblica/:matchId" element={<AnalisiPubblica />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Home />} />
                  <Route path="/import" element={<ImportDvw />} />
                  <Route path="/importa-dati" element={<ImportDati />} />
                  <Route path="/match/:id" element={<MatchAnalysis />} />
                  <Route path="/match-multi" element={<MatchAnalysisMulti />} />
                  <Route path="/archive" element={<Archive />} />
                  <Route path="/scout" element={<Index />} />
                  <Route path="/supporto" element={<Support />} />

                  {/* Gestionale */}
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/presenze" element={<Presenze />} />
                  <Route path="/scadenze" element={<Scadenze />} />
                  <Route path="/convocazioni" element={<Convocazioni />} />
                  <Route path="/comunicazioni" element={<Comunicazioni />} />
                  <Route path="/magazzino" element={<Magazzino />} />

                  {/* Coaching */}
                  <Route path="/esercizi" element={<Esercizi />} />
                  <Route path="/allenamenti" element={<Allenamenti />} />
                  <Route path="/allenamenti/:id" element={<AllenamentoDetail />} />
                  <Route path="/scheletri" element={<Scheletri />} />
                  <Route path="/schemi" element={<Schemi />} />
                  <Route path="/volume" element={<Volume />} />
                  <Route path="/programmazione" element={<ProgrammazioneStagionale />} />
                  <Route path="/obiettivi" element={<Obiettivi />} />
                  <Route path="/guida-tecnica" element={<GuidaTecnica />} />

                  {/* Analisi */}
                  <Route path="/report-stagione" element={<ReportStagione />} />
                  <Route path="/profilo-avversario" element={<ProfiloAvversario />} />

                  {/* Atleta */}
                  <Route path="/atleti" element={<Atleti />} />
                  <Route path="/atleti/:id" element={<AtletaDetail />} />
                  <Route path="/valutazioni" element={<Valutazioni />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/infortuni" element={<Infortuni />} />

                  {/* Squadre */}
                  <Route path="/squadre" element={<TeamsHub />} />
                  <Route path="/squadre/:id" element={<TeamDashboard />} />

                  {/* Impostazioni società (society_admin) */}
                  <Route path="/impostazioni" element={<SocietySettings />} />

                  {/* Preferenze personali (tutti gli utenti) */}
                  <Route path="/personalizza" element={<Personalizza />} />

                  {/* Admin */}
                  <Route path="/admin" element={<AdminSocieties />} />
                  <Route path="/admin/societa/:id/moduli" element={<SocietyFeatures />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
