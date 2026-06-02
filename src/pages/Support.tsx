import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, FileUp, Activity, Users, BarChart3 } from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

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

        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem
            value="dvw"
            className="rounded-xl border border-border bg-card overflow-hidden px-5"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-bold text-base">
                <FileUp className="w-5 h-5 text-primary shrink-0" />
                <span>📁 Come importare un DVW</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <ol className="space-y-1.5 list-decimal pl-5">
                <li>Vai su Importa DVW dalla sidebar.</li>
                <li>Trascina il file .dvw nella zona upload.</li>
                <li>Attendi il parsing automatico.</li>
                <li>Clicca su "Analizza" per vedere le statistiche.</li>
              </ol>
              <p className="text-xs text-muted-foreground italic mt-3 border-l-2 border-primary pl-3">
                💡 I file .dvw vengono da DataVolley, VolleyStudio, Click&amp;Scout o dal tuo Scout Live.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="live"
            className="rounded-xl border border-border bg-card overflow-hidden px-5"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-bold text-base">
                <Activity className="w-5 h-5 text-primary shrink-0" />
                <span>🔴 Come usare Scout Live</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <ol className="space-y-1.5 list-decimal pl-5">
                <li>Vai su Scout Live dalla sidebar.</li>
                <li>Configura le due squadre (casa e ospite).</li>
                <li>Inserisci la formazione iniziale di entrambe.</li>
                <li>Per ogni azione: tocca la giocatrice sul campo → scegli fondamentale → valutazione.</li>
                <li>Alla fine esporta il file DVW.</li>
              </ol>
              <p className="text-xs text-muted-foreground italic mt-3 border-l-2 border-primary pl-3">
                💡 Usa le Impostazioni Scout ⚙️ per semplificare il flusso.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="coach"
            className="rounded-xl border border-border bg-card overflow-hidden px-5"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-bold text-base">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <span>👥 Come invitare un coach</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <ol className="space-y-1.5 list-decimal pl-5">
                <li>Vai su Admin (visibile solo per super admin).</li>
                <li>Trova la tua società nella lista.</li>
                <li>Clicca su "Coach" e poi "Invita coach".</li>
                <li>Inserisci l'email del coach.</li>
                <li>Manda il link ricevuto al coach.</li>
              </ol>
              <p className="text-xs text-muted-foreground italic mt-3 border-l-2 border-primary pl-3">
                💡 Il link di invito scade dopo 7 giorni.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="analisi"
            className="rounded-xl border border-border bg-card overflow-hidden px-5"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 font-bold text-base">
                <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                <span>📊 Come leggere l'analisi DVW</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <ol className="space-y-1.5 list-decimal pl-5">
                <li>Panoramica — statistiche base per fondamentale e valutazione.</li>
                <li>Heatmap — distribuzione zone del campo per attacco e ricezione.</li>
                <li>Giocatori — performance individuali per fondamentale.</li>
                <li>Rotazioni — analisi per rotazione palleggiatore (R1–R6).</li>
                <li>Confronto — squadra casa vs squadra ospite.</li>
                <li>Grafici — trend, distribuzioni, punti per set.</li>
                <li>Avanzate — K1/K2, distribuzione, ricezione e battuta dettagliate.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
