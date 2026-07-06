import { lazy, Suspense } from "react";
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
import Index from "./pages/Index.tsx";
import ImportDvw from "./pages/ImportDvw.tsx";
import MatchAnalysisMulti from "./pages/MatchAnalysisMulti.tsx";
import Archive from "./pages/Archive.tsx";
import Auth from "./pages/Auth.tsx";
import AcceptInvitation from "./pages/AcceptInvitation.tsx";
import ClaimSuperAdmin from "./pages/ClaimSuperAdmin.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Support from "./pages/Support.tsx";
import NotFound from "./pages/NotFound.tsx";
import AnalisiPubblica from "./pages/AnalisiPubblica.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";

// Gestionale
import Calendario from "./pages/gestionale/Calendario.tsx";
import Presenze from "./pages/gestionale/Presenze.tsx";
import Convocazioni from "./pages/gestionale/Convocazioni.tsx";
import Comunicazioni from "./pages/gestionale/Comunicazioni.tsx";
import Magazzino from "./pages/gestionale/Magazzino.tsx";

// Coaching (alcune lazy)
import Scheletri from "./pages/coaching/Scheletri.tsx";
import Schemi from "./pages/coaching/Schemi.tsx";
import Obiettivi from "./pages/coaching/Obiettivi.tsx";

// Analisi
import ReportStagione from "./pages/analisi/ReportStagione.tsx";
import ProfiloAvversario from "./pages/analisi/ProfiloAvversario.tsx";

// Atleta
import Atleti from "./pages/atleta/Atleti.tsx";
import Valutazioni from "./pages/atleta/Valutazioni.tsx";
import Inventario from "./pages/atleta/Inventario.tsx";
import Infortuni from "./pages/atleta/Infortuni.tsx";

// Admin
import SocietyFeatures from "./pages/admin/SocietyFeatures.tsx";
import SocietySettings from "./pages/SocietySettings.tsx";

// Lazy-loaded heavy routes (bundle splitting)
const MatchAnalysis = lazy(() => import("./pages/MatchAnalysis.tsx"));
const Allenamenti = lazy(() => import("./pages/coaching/Allenamenti.tsx"));
const Volume = lazy(() => import("./pages/coaching/Volume.tsx"));
const GuidaTecnica = lazy(() => import("./pages/coaching/GuidaTecnica.tsx"));
const Esercizi = lazy(() => import("./pages/coaching/Esercizi.tsx"));
const Periodizzazione = lazy(() => import("./pages/coaching/Periodizzazione.tsx"));
const Pianificazione = lazy(() => import("./pages/coaching/Pianificazione.tsx"));
const AdminSocieties = lazy(() => import("./pages/admin/Societies.tsx"));
const AtletaDetail = lazy(() => import("./pages/atleta/AtletaDetail.tsx"));
const TeamsHub = lazy(() => import("./pages/TeamsHub.tsx"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard.tsx"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/claim-super-admin" element={<ProtectedRoute><ClaimSuperAdmin /></ProtectedRoute>} />
                <Route path="/analisi-pubblica/:matchId" element={<AnalisiPubblica />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Home />} />
                  <Route path="/import" element={<ImportDvw />} />
                  <Route path="/match/:id" element={<MatchAnalysis />} />
                  <Route path="/match-multi" element={<MatchAnalysisMulti />} />
                  <Route path="/archive" element={<Archive />} />
                  <Route path="/scout" element={<Index />} />
                  <Route path="/supporto" element={<Support />} />

                  {/* Gestionale */}
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/presenze" element={<Presenze />} />
                  <Route path="/convocazioni" element={<Convocazioni />} />
                  <Route path="/comunicazioni" element={<Comunicazioni />} />
                  <Route path="/magazzino" element={<Magazzino />} />

                  {/* Coaching */}
                  <Route path="/esercizi" element={<Esercizi />} />
                  <Route path="/allenamenti" element={<Allenamenti />} />
                  <Route path="/scheletri" element={<Scheletri />} />
                  <Route path="/schemi" element={<Schemi />} />
                  <Route path="/volume" element={<Volume />} />
                  <Route path="/pianificazione" element={<Pianificazione />} />
                  <Route path="/periodizzazione" element={<Periodizzazione />} />
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

                  {/* Impostazioni società (society_admin) */}
                  <Route path="/impostazioni" element={<SocietySettings />} />

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
