import { Link } from 'react-router-dom';
import { FileUp, Activity, Library } from 'lucide-react';
import { HomeBlocks } from '@/components/home/HomeBlocks';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { GettingStarted } from '@/components/home/GettingStarted';
import { InstallPrompt } from '@/components/home/InstallPrompt';

/**
 * Home dell'app: due entry point principali — Importa DVW e Scout Live —
 * più scorciatoie per archivio squadre/partite e admin.
 */
export default function Home() {
  const { societyId, loading: societyLoading } = useActiveSociety();
  const noSociety = !societyLoading && !societyId;

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* SALUTO COMPATTO: i blocchi devono stare sopra la piega */}
      <section className="container pt-6 pb-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">Pannello Coach</p>
        <h2 className="text-2xl md:text-3xl font-black italic uppercase leading-tight tracking-tight">
          Cosa vuoi fare <span className="text-primary">oggi?</span>
        </h2>
      </section>

      {/* DUE ENTRY POINT — solo se non c'è una società (altrimenti sono card dei blocchi) */}
      {noSociety && (
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
      )}

      {/* ARCHIVIO */}
      {noSociety && (
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
      )}

      {/* DASHBOARD OPERATIVA */}
      <InstallPrompt />
      <GettingStarted />
      <HomeBlocks />
    </div>
  );
}
