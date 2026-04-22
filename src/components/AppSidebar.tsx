import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { isFeatureEnabled, type FeatureKey } from '@/lib/societyFeatures';
import {
  Home, FileUp, Activity, Library,
  Calendar, ClipboardCheck, ListChecks, Megaphone, Package,
  Dumbbell, ClipboardList, LayoutTemplate, GitBranch, Workflow, BarChart3, Target, CalendarRange, BookOpen,
  PieChart, UserCircle, Star,
  LogOut, Shield, Boxes,
} from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  /** Se presente, la voce è visibile solo se la feature è attiva (default: sempre visibile). */
  feature?: FeatureKey;
}

const MAIN: NavItem[] = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Importa DVW', url: '/import', icon: FileUp, feature: 'advanced_stats' },
  { title: 'Scout Live', url: '/scout', icon: Activity, feature: 'live_scout' },
  { title: 'Archivio', url: '/archive', icon: Library, feature: 'advanced_stats' },
];

const GESTIONALE: NavItem[] = [
  { title: 'Calendario', url: '/calendario', icon: Calendar },
  { title: 'Presenze', url: '/presenze', icon: ClipboardCheck },
  { title: 'Convocazioni', url: '/convocazioni', icon: ListChecks },
  { title: 'Comunicazioni', url: '/comunicazioni', icon: Megaphone, feature: 'communications' },
  { title: 'Magazzino', url: '/magazzino', icon: Package, feature: 'athletes' },
];

const COACHING: NavItem[] = [
  { title: 'Esercizi', url: '/esercizi', icon: Dumbbell, feature: 'exercises' },
  { title: 'Allenamenti', url: '/allenamenti', icon: ClipboardList, feature: 'exercises' },
  { title: 'Scheletri', url: '/scheletri', icon: LayoutTemplate, feature: 'training_calendar' },
  { title: 'Schemi', url: '/schemi', icon: GitBranch, feature: 'training_calendar' },
  { title: 'Volume', url: '/volume', icon: BarChart3, feature: 'training_calendar' },
  { title: 'Pianificazione', url: '/pianificazione', icon: CalendarRange, feature: 'training_calendar' },
  { title: 'Periodizzazione', url: '/periodizzazione', icon: Workflow, feature: 'training_calendar' },
  { title: 'Obiettivi', url: '/obiettivi', icon: Target },
  { title: 'Guida Tecnica', url: '/guida-tecnica', icon: BookOpen, feature: 'guidelines' },
];

const ANALISI: NavItem[] = [
  { title: 'Report Stagione', url: '/report-stagione', icon: PieChart, feature: 'advanced_stats' },
  { title: 'Profilo Avversario', url: '/profilo-avversario', icon: Shield, feature: 'advanced_stats' },
];

const ATLETA: NavItem[] = [
  { title: 'Atleti', url: '/atleti', icon: UserCircle, feature: 'athletes' },
  { title: 'Valutazioni', url: '/valutazioni', icon: Star, feature: 'athletes' },
  { title: 'Inventario', url: '/inventario', icon: Boxes, feature: 'athletes' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isSuperAdmin, signOut } = useAuth();
  const { societyName, features } = useActiveSociety();

  const visible = (items: NavItem[]) =>
    items.filter((i) => !i.feature || isFeatureEnabled(features, i.feature));

  const renderItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === '/'}
            className="hover:bg-muted/50"
            activeClassName="bg-primary/10 text-primary font-semibold border-l-2 border-primary"
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const mainItems = visible(MAIN);
  const gestionaleItems = visible(GESTIONALE);
  const coachingItems = visible(COACHING);
  const analisiItems = visible(ANALISI);
  const atletaItems = visible(ATLETA);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase italic tracking-tight truncate">VolleyScout</p>
              {societyName ? (
                <p className="text-[11px] font-semibold text-primary truncate" title={societyName}>
                  {societyName}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground truncate">Nessuna società</p>
              )}
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {mainItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Principale</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {gestionaleItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Gestionale</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(gestionaleItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {coachingItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Coaching</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(coachingItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {analisiItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Analisi</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(analisiItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {atletaItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Atleta & Magazzino</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(atletaItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60">
        {isSuperAdmin && !collapsed && (
          <NavLink to="/admin" className="block">
            <Button variant="outline" size="sm" className="w-full">Admin</Button>
          </NavLink>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Esci</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
