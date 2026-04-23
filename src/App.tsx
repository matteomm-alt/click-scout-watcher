import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClaimSuperAdminBadge } from "@/components/ClaimSuperAdminBadge";
import AppLayout from "@/components/AppLayout";
import Home from "./pages/Home.tsx";
import Index from "./pages/Index.tsx";
import ImportDvw from "./pages/ImportDvw.tsx";
import MatchAnalysis from "./pages/MatchAnalysis.tsx";
import Archive from "./pages/Archive.tsx";
import Auth from "./pages/Auth.tsx";
import ClaimSuperAdmin from "./pages/ClaimSuperAdmin.tsx";
import NotFound from "./pages/NotFound.tsx";

// Gestionale
import Calendario from "./pages/gestionale/Calendario.tsx";
import CalendarioNuovo from "./pages/gestionale/CalendarioNuovo.tsx";
import Presenze from "./pages/gestionale/Presenze.tsx";
import Convocazioni from "./pages/gestionale/Convocazioni.tsx";
import Comunicazioni from "./pages/gestionale/Comunicazioni.tsx";
import Magazzino from "./pages/gestionale/Magazzino.tsx";

// Coaching
import Esercizi from "./pages/coaching/Esercizi.tsx";
import Allenamenti from "./pages/coaching/Allenamenti.tsx";
import Scheletri from "./pages/coaching/Scheletri.tsx";
import Schemi from "./pages/coaching/Schemi.tsx";
import Volume from "./pages/coaching/Volume.tsx";
import Pianificazione from "./pages/coaching/Pianificazione.tsx";
import Periodizzazione from "./pages/coaching/Periodizzazione.tsx";
import Obiettivi from "./pages/coaching/Obiettivi.tsx";
import GuidaTecnica from "./pages/coaching/GuidaTecnica.tsx";

// Analisi
import ReportStagione from "./pages/analisi/ReportStagione.tsx";
import ProfiloAvversario from "./pages/analisi/ProfiloAvversario.tsx";

// Atleta
import Atleti from "./pages/atleta/Atleti.tsx";
import Valutazioni from "./pages/atleta/Valutazioni.tsx";
import Inventario from "./pages/atleta/Inventario.tsx";
import Infortuni from "./pages/atleta/Infortuni.tsx";

// Admin
import AdminSocieties from "./pages/admin/Societies.tsx";
import SocietyFeatures from "./pages/admin/SocietyFeatures.tsx";
import SocietySettings from "./pages/SocietySettings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClaimSuperAdminBadge />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/claim-super-admin" element={<ProtectedRoute><ClaimSuperAdmin /></ProtectedRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Home />} />
              <Route path="/import" element={<ImportDvw />} />
              <Route path="/match/:id" element={<MatchAnalysis />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/scout" element={<Index />} />

              {/* Gestionale */}
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/calendario/nuovo" element={<CalendarioNuovo />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
