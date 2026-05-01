import { useMemo, useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useNotifications } from '@/hooks/useNotifications';
import { isFeatureEnabled, type FeatureKey } from '@/lib/societyFeatures';
import {
  Home, FileUp, Activity, Library,
  Calendar, ClipboardCheck, ListChecks, Megaphone, Package,
  Dumbbell, ClipboardList, LayoutTemplate, GitBranch, Workflow, BarChart3, Target, CalendarRange, BookOpen,
  PieChart, UserCircle, Star, HeartPulse,
  LogOut, Shield, Boxes, Settings, HelpCircle, Bell,
} from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  /** Se presente, la voce è visibile solo se la feature è attiva (default: sempre visibile). */
  feature?: FeatureKey;
  /** Chiave per associare il badge notifiche. */
  badgeKey?: 'comunicazioni' | 'presenze' | 'convocazioni';
}

const MAIN: NavItem[] = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Importa DVW', url: '/import', icon: FileUp, feature: 'advanced_stats' },
  { title: 'Scout Live', url: '/scout', icon: Activity, feature: 'live_scout' },
  { title: 'Archivio', url: '/archive', icon: Library, feature: 'advanced_stats' },
];

const GESTIONALE: NavItem[] = [
  { title: 'Calendario', url: '/calendario', icon: Calendar },
  { title: 'Presenze', url: '/presenze', icon: ClipboardCheck, badgeKey: 'presenze' },
  { title: 'Convocazioni', url: '/convocazioni', icon: ListChecks, badgeKey: 'convocazioni' },
  { title: 'Comunicazioni', url: '/comunicazioni', icon: Megaphone, feature: 'communications', badgeKey: 'comunicazioni' },
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
  { title: 'Infortuni', url: '/infortuni', icon: HeartPulse, feature: 'injuries' },
  { title: 'Inventario', url: '/inventario', icon: Boxes, feature: 'athletes' },
];

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center">
      {value > 99 ? '99+' : value}
    </span>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isSuperAdmin, signOut } = useAuth();
  const { societyId, societyName, features, isAdmin } = useActiveSociety();
  const counts = useNotifications(societyId, user?.id ?? null);
  const [bellOpen, setBellOpen] = useState(false);

  const totalNotifs = counts.comunicazioni + counts.presenze + counts.convocazioni;

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
            {!collapsed && item.badgeKey && <Badge value={counts[item.badgeKey]} />}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const mainItems = useMemo(() => visible(MAIN), [features]);
  const gestionaleItems = useMemo(() => visible(GESTIONALE), [features]);
  const coachingItems = useMemo(() => visible(COACHING), [features]);
  const analisiItems = useMemo(() => visible(ANALISI), [features]);
  const atletaItems = useMemo(() => visible(ATLETA), [features]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
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
          {!collapsed && (
            <Popover open={bellOpen} onOpenChange={setBellOpen}>
              <PopoverTrigger asChild>
                <button
                  className="relative w-8 h-8 rounded-md hover:bg-muted/60 flex items-center justify-center shrink-0"
                  aria-label="Notifiche"
                >
                  <Bell className="w-4 h-4" />
                  {totalNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-black flex items-center justify-center">
                      {totalNotifs > 99 ? '99+' : totalNotifs}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3 space-y-2">
                <p className="text-xs font-bold uppercase italic tracking-wide text-muted-foreground">
                  Notifiche
                </p>
                {totalNotifs === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">
                    Nessuna notifica 🎉
                  </p>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    {counts.comunicazioni > 0 && (
                      <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50">
                        <Megaphone className="w-4 h-4 text-primary" />
                        <span className="flex-1">Comunicazioni urgenti non lette</span>
                        <Badge value={counts.comunicazioni} />
                      </div>
                    )}
                    {counts.presenze > 0 && (
                      <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50">
                        <ClipboardCheck className="w-4 h-4 text-primary" />
                        <span className="flex-1">Atleti sotto 70% presenze</span>
                        <Badge value={counts.presenze} />
                      </div>
                    )}
                    {counts.convocazioni > 0 && (
                      <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <span className="flex-1">Convocazioni recenti (48h)</span>
                        <Badge value={counts.convocazioni} />
                      </div>
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
            {!collapsed && <SidebarGroupLabel>Atleta &amp; Magazzino</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(atletaItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/impostazioni"
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                    >
                      <Settings className="h-4 w-4" />
                      {!collapsed && <span>Impostazioni</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
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
        <NavLink
          to="/supporto"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/60 text-muted-foreground hover:text-foreground"
          activeClassName="bg-primary/10 text-primary font-semibold"
        >
          <HelpCircle className="w-4 h-4" />
          {!collapsed && <span>Supporto</span>}
        </NavLink>
      </SidebarFooter>
    </Sidebar>
  );
}
