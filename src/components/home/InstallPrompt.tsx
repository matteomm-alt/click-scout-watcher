import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'pwa_install_dismissed';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  const install = async () => {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === 'accepted') localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="container pb-6">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
        <Download className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Installa VolleyScout sul tuo dispositivo</p>
          <p className="text-xs text-muted-foreground">Apri l'app a schermo intero, offline e in landscape per lo scouting live.</p>
        </div>
        <Button size="sm" onClick={install} className="flex-shrink-0">Installa</Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={dismiss} aria-label="Chiudi">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
