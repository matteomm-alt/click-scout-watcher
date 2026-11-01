import { useEffect, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
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
import { SeasonSelector } from '@/components/SeasonSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useNotifications } from '@/hooks/useNotifications';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { usePreferences } from '@/hooks/usePreferences';
import { BLOCKS, GENERAL_ITEMS, HOME_ITEM, type NavItem } from '@/lib/navConfig';
import {
  BarChart3, LogOut, Shield, Settings, HelpCircle, Bell, Zap, Sun, Moon, SlidersHorizontal,
  Megaphone, ClipboardCheck, ListChecks, ChevronDown,
} from 'lucide-react';

const SCOUT_MODE_KEY = 'sidebar_scout_mode';
const SCOUT_MODE_URLS = new Set(['/', '/scout', '/archive', '/import', '/atleti', '/calendario', '/presenze']);

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs font-black flex items-center justify-center">
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
  const { prefs } = usePreferences();
  const [bellOpen, setBellOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user?.id]);
  const [scoutMode, setScoutMode] = useState<boolean>(() => localStorage.getItem(SCOUT_MODE_KEY) === 'true');
  const toggleScoutMode = () => {
    setScoutMode((prev) => {
      const next = !prev;
      localStorage.setItem(SCOUT_MODE_KEY, String(next));
      return next;
    });
  };

  const CLOSED_KEY = 'sidebar_closed_blocks';
  const [closedBlocks, setClosedBlocks] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]'); } catch { return []; }
  });
  const toggleBlockOpen = (id: string) =>
    setClosedBlocks((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(CLOSED_KEY, JSON.stringify(next)); } catch { /* storage non disponibile */ }
      return next;
    });

  const totalNotifs = counts.comunicazioni + counts.presenze + counts.convocazioni;

  const visible = (items: NavItem[]) => {
    const filtered = items.filter(
      (i) => (!i.feature || isFeatureEnabled(features, i.feature)) && !prefs.hiddenItems.includes(i.url),
    );
    return scoutMode ? filtered.filter((i) => SCOUT_MODE_URLS.has(i.url)) : filtered;
  };

  const renderItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === '/'}
            className="hover:bg-muted/50"
            activeClassName="bg-primary/10 text-orange-700 dark:text-primary font-semibold border-l-2 border-primary"
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && item.badgeKey && <Badge value={counts[item.badgeKey]} />}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const homeItems = [HOME_ITEM];
  const generalItems = visible(GENERAL_ITEMS);
  const blockGroups = prefs.blockOrder
    .filter((id) => !prefs.hiddenBlocks.includes(id))
    .map((id) => ({ block: BLOCKS[id], items: visible(BLOCKS[id].items) }))
    .filter((g) => g.items.length > 0);

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
                <p className="text-xs font-semibold text-orange-700 dark:text-primary truncate" title={societyName}>
                  {societyName}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">Nessuna società</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
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
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-xs font-black flex items-center justify-center">
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
        {!collapsed && (
          <div className="mx-2 mb-2 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
              Stagione
            </span>
            <SeasonSelector className="flex-1" />
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleScoutMode}
            className={`mx-2 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
              scoutMode
                ? 'bg-primary/15 text-orange-700 dark:text-primary border border-primary/30'
                : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'
            }`}
            title={scoutMode ? 'Modalità Scout attiva: solo voci essenziali' : 'Mostra tutte le sezioni'}
          >
            <Zap className="w-3 h-3" />
            {scoutMode ? 'Modalità Scout' : 'Tutte le sezioni'}
          </button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems([...homeItems, ...generalItems])}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {blockGroups.map(({ block, items }) => {
          const closed = closedBlocks.includes(block.id) && !collapsed;
          return (
            <SidebarGroup key={block.id}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleBlockOpen(block.id)}
                  aria-expanded={!closed}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-muted/50 ${block.text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${block.dot}`} />
                  {block.label}
                  <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${closed ? '-rotate-90' : ''}`} />
                </button>
              )}
              {!closed && (
                <SidebarGroupContent>
                  <SidebarMenu>{renderItems(items)}</SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/squadre"
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-orange-700 dark:text-primary font-semibold border-l-2 border-primary"
                    >
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Squadre</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/impostazioni"
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-orange-700 dark:text-primary font-semibold border-l-2 border-primary"
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
        <div className="flex items-center gap-2 px-2 py-2 border-b border-border/40 mb-1">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/15 text-orange-800 dark:text-primary flex items-center justify-center font-black text-sm shrink-0">
              {(profile?.full_name ?? user?.email ?? '?')[0]?.toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">
                {profile?.full_name ?? user?.email?.split('@')[0] ?? 'Coach'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <div className={`grid gap-1 ${collapsed ? 'grid-cols-1' : 'grid-cols-4'}`}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
            className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NavLink
            to="/personalizza"
            aria-label="Personalizza"
            title="Personalizza"
            className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeClassName="bg-primary/10 text-orange-700 dark:text-primary"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </NavLink>
          <NavLink
            to="/supporto"
            aria-label="Supporto"
            title="Supporto"
            className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeClassName="bg-primary/10 text-orange-700 dark:text-primary"
          >
            <HelpCircle className="w-4 h-4" />
          </NavLink>
          <button
            type="button"
            onClick={signOut}
            aria-label="Esci"
            title="Esci"
            className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
