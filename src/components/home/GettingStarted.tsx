import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

const DISMISS_KEY = 'getting_started_dismissed';

export function GettingStarted() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [hasAthletes, setHasAthletes] = useState(false);
  const [hasMatches, setHasMatches] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );

  useEffect(() => {
    if (!societyId || !user) return;
    let cancelled = false;
    (async () => {
      const [aRes, mRes] = await Promise.all([
        supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('society_id', societyId),
        supabase.from('scout_matches').select('id', { count: 'exact', head: true }).eq('coach_id', user.id),
      ]);
      if (cancelled) return;
      setHasAthletes((aRes.count ?? 0) > 0);
      setHasMatches((mRes.count ?? 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [societyId, user?.id]);

  const steps: Step[] = [
    { id: 'society', label: 'Società configurata', description: 'Il tuo account è pronto', href: '/impostazioni', done: !!societyId },
    { id: 'athletes', label: 'Aggiungi i tuoi atleti', description: 'Inserisci almeno un atleta nel roster', href: '/atleti', done: hasAthletes },
    { id: 'scout', label: 'Scoutizza la prima partita', description: 'Avvia uno Scout Live o importa un DVW', href: '/scout', done: hasMatches },
  ];

  const allDone = steps.every((s) => s.done);

  // Auto-dismiss 3 giorni dopo il completamento
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, 'true');
      setDismissed(true);
    }, 3 * 24 * 60 * 60 * 1000);
    return () => clearTimeout(t);
  }, [allDone]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;
  if (!societyId) return null;

  return (
    <section className="container pt-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black italic uppercase tracking-tight">
            {allDone ? '✅ Tutto pronto!' : 'Per iniziare'}
          </h3>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Nascondi"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={step.id}>
              <Link
                to={step.href}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  step.done
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {i + 1}. {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                {!step.done && <ArrowRight className="w-4 h-4 text-primary shrink-0" />}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
