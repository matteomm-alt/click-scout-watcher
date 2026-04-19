import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

/**
 * Floating fullscreen / hide-sidebar toggle for the live scout.
 * - Left button: collapse/expand the app sidebar (in-page toggle)
 * - Right button: enter/exit native browser fullscreen
 */
export function FullscreenToggle() {
  const { open, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const sidebarVisible = isMobile ? openMobile : open;

  const toggleSidebar = () => {
    if (isMobile) setOpenMobile(!openMobile);
    else setOpen(!open);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  return (
    <div className="fixed top-3 right-3 z-50 flex gap-1.5 bg-background/80 backdrop-blur-md border border-border/60 rounded-lg p-1 shadow-lg">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={toggleSidebar}
        title={sidebarVisible ? 'Nascondi sidebar' : 'Mostra sidebar'}
      >
        {sidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}
