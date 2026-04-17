import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClaimSuperAdminBadge } from "@/components/ClaimSuperAdminBadge";
import Home from "./pages/Home.tsx";
import Index from "./pages/Index.tsx";
import ImportDvw from "./pages/ImportDvw.tsx";
import MatchAnalysis from "./pages/MatchAnalysis.tsx";
import Archive from "./pages/Archive.tsx";
import Auth from "./pages/Auth.tsx";
import ClaimSuperAdmin from "./pages/ClaimSuperAdmin.tsx";
import NotFound from "./pages/NotFound.tsx";

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
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><ImportDvw /></ProtectedRoute>} />
            <Route path="/match/:id" element={<ProtectedRoute><MatchAnalysis /></ProtectedRoute>} />
            <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
            <Route path="/scout" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
