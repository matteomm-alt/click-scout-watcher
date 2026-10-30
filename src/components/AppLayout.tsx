import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ClaimSuperAdminBadge } from '@/components/ClaimSuperAdminBadge';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground font-body">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/60 px-3">
            <SidebarTrigger />
            <button
              type="button"
              onClick={toggleTheme}
              className="ml-auto h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
              title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
        <ClaimSuperAdminBadge />
      </div>
    </SidebarProvider>
  );
}
