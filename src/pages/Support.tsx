import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, FileUp, Activity, Users, BarChart3 } from 'lucide-react';

interface GuideProps {
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  title: string;
  steps: string[];
  note?: string;
}

function Guide({ icon: Icon, emoji, title, steps, note }: GuideProps) {
  return (
    <details className="group rounded-xl border border-border bg-card overflow-hidden">
      <summary className="cursor-pointer list-none flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors">
        <Icon className="w-5 h-5 text-primary shrink-0" />
        <span className="font-bold text-base flex-1">
          <span className="mr-1">{emoji}</span> {title}
        </span>
        <span className="text-xs font-bold text-muted-foreground group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>
      <div className="px-5 py-4 border-t border-border space-y-2 text-sm">
        <ol className="space-y-1.5 list-decimal pl-5">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {note && (
          <p className="text-xs text-muted-foreground italic mt-3 border-l-2 border-primary pl-3">
            💡 {note}
          </p>
        )}
      </div>
    </details>
  );
}

export default function Support() {
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black italic uppercase tracking-tight">
          Supporto &amp; Documentazione
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Come usare VolleyScout Pro.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold uppercase italic tracking-wide">Guide rapide</h2>

        <Guide
          icon={FileUp}
          emoji="📁"
          title="Come importare un DVW"
          steps={[
            'Vai su Importa DVW dalla sidebar.',
            'Trascina il file .dvw nella zona upload.',
            'Attendi il parsing automatico.',
            'Clicca su "Analizza" per vedere le statistiche.',
          ]}
          note="I file .dvw vengono da DataVolley, VolleyStudio, Click&Scout o dal tuo Scout Live."
        />

        <Guide
          icon={Activity}
          emoji="🔴"
          title="Come usare Scout Live"
          steps={[
            'Vai su Scout Live dalla sidebar.',
            'Configura le due squadre (casa e ospite).',
            'Inserisci la formazione iniziale di entrambe.',
            'Per ogni azione: scegli squadra → giocatore → fondamentale → valutazione → zona.',
            'Alla fine esporta il file DVW.',
          ]}
          note="Usa le Impostazioni Scout ⚙️ per semplificare il flusso (es. disabilita combo attacco per chi inizia)."
        />

        <Guide
          icon={Users}
          emoji="👥"
          title="Come invitare un coach"
          steps={[
            'Vai su Admin (visibile solo per super admin).',
            'Trova la tua società nella lista.',
            'Clicca su "Coach" e poi "Invita coach".',
            'Inserisci l\'email del coach.',
            'Manda il link ricevuto al coach.',
          ]}
          note="Il link di invito scade dopo 7 giorni."
        />

        <Guide
          icon={BarChart3}
          emoji="📊"
          title="Come leggere l'analisi DVW"
          steps={[
            'Panoramica — statistiche base (skill, valutazioni, set).',
            'Heatmap — distribuzione zone del campo per attacco/ricezione.',
            'Giocatori — performance individuali per fondamentale.',
            'Rotazioni — analisi per rotazione palleggiatore (R1-R6).',
            'Confronto — squadra casa vs squadra ospite.',
            'Grafici — visualizzazioni recharts (trend, distribuzioni).',
            'Avanzate — K1/K2, distribuzione, ricezione, battuta dettagliate.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold uppercase italic tracking-wide">Contatti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              <div>
                <p className="font-bold">Email</p>
                <p className="text-xs text-muted-foreground">support@volleyscout.pro</p>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="mailto:support@volleyscout.pro">Scrivi email</a>
            </Button>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="font-bold">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Risposta entro 24h</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href="https://wa.me/393000000000" target="_blank" rel="noreferrer">
                Apri WhatsApp
              </a>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
