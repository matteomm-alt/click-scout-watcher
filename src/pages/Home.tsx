import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FileUp, Activity, BarChart3, Library, LogOut } from 'lucide-react';

/**
 * Home dell'app: due entry point principali — Importa DVW e Scout Live —
 * più scorciatoie per archivio squadre/partite e admin.
 */
export default function Home() {
  const { user, isSuperAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* HEADER */}
      <header className="border-b border-border/60">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight italic">VolleyScout Pro</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Esci
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="container py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
          Pannello Coach
        </p>
        <h2 className="text-5xl md:text-6xl font-black italic uppercase leading-[0.9] tracking-tight mb-3">
          Cosa vuoi fare<br />
          <span className="text-primary">oggi?</span>
        </h2>
        <p className="text-muted-foreground max-w-xl">
          Importa file DataVolley (.dvw) per analizzare le partite avversarie, oppure avvia uno scouting dal vivo per la tua squadra.
        </p>
      </section>

      {/* DUE ENTRY POINT */}
      <section className="container pb-8 grid md:grid-cols-2 gap-4">
        {/* Importa DVW */}
        <Link
          to="/import"
          className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary transition-colors p-8 min-h-[260px] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
              <FileUp className="w-7 h-7 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">01</span>
          </div>
          <div>
            <h3 className="text-3xl font-black italic uppercase leading-none mb-2">
              Importa<br />Analisi DVW
            </h3>
            <p className="text-sm text-muted-foreground">
              Carica un file .dvw e ottieni heatmap, statistiche giocatori, rotazioni e confronto squadre.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
        </Link>

        {/* Scout Live */}
        <Link
          to="/scout"
          className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary transition-colors p-8 min-h-[260px] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">02</span>
          </div>
          <div>
            <h3 className="text-3xl font-black italic uppercase leading-none mb-2">
              Scout Live<br />Partita in corso
            </h3>
            <p className="text-sm text-muted-foreground">
              Modalità di scouting touch-friendly per registrare azioni durante la partita.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
        </Link>
      </section>

      {/* ARCHIVIO */}
      <section className="container pb-12">
        <Link
          to="/archive"
          className="block rounded-xl border border-border bg-card hover:border-primary/50 transition-colors p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Library className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <h4 className="font-bold uppercase italic tracking-tight">Archivio</h4>
              <p className="text-xs text-muted-foreground">Squadre e partite importate in precedenza</p>
            </div>
          </div>
          <span className="text-primary font-bold">→</span>
        </Link>
      </section>
    </div>
  );
}
