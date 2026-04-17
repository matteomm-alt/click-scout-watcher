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
}

const MAIN: NavItem[] = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Importa DVW', url: '/import', icon: FileUp },
  { title: 'Scout Live', url: '/scout', icon: Activity },
  { title: 'Archivio', url: '/archive', icon: Library },
];

const GESTIONALE: NavItem[] = [
  { title: 'Calendario', url: '/calendario', icon: Calendar },
  { title: 'Presenze', url: '/presenze', icon: ClipboardCheck },
  { title: 'Convocazioni', url: '/convocazioni', icon: ListChecks },
  { title: 'Comunicazioni', url: '/comunicazioni', icon: Megaphone },
  { title: 'Magazzino', url: '/magazzino', icon: Package },
];

const COACHING: NavItem[] = [
  { title: 'Esercizi', url: '/esercizi', icon: Dumbbell },
  { title: 'Allenamenti', url: '/allenamenti', icon: ClipboardList },
  { title: 'Scheletri', url: '/scheletri', icon: LayoutTemplate },
  { title: 'Schemi', url: '/schemi', icon: GitBranch },
  { title: 'Volume', url: '/volume', icon: BarChart3 },
  { title: 'Pianificazione', url: '/pianificazione', icon: CalendarRange },
  { title: 'Periodizzazione', url: '/periodizzazione', icon: Workflow },
  { title: 'Obiettivi', url: '/obiettivi', icon: Target },
  { title: 'Guida Tecnica', url: '/guida-tecnica', icon: BookOpen },
];

const ANALISI: NavItem[] = [
  { title: 'Report Stagione', url: '/report-stagione', icon: PieChart },
  { title: 'Profilo Avversario', url: '/profilo-avversario', icon: Shield },
];

const ATLETA: NavItem[] = [
  { title: 'Atleti', url: '/atleti', icon: UserCircle },
  { title: 'Valutazioni', url: '/valutazioni', icon: Star },
  { title: 'Inventario', url: '/inventario', icon: Boxes },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isSuperAdmin, signOut } = useAuth();

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
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principale</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(MAIN)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Gestionale</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(GESTIONALE)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Coaching</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(COACHING)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Analisi</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(ANALISI)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Atleta & Magazzino</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(ATLETA)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
