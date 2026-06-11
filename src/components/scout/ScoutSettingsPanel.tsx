import { useState } from 'react';
import { Move } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { type ScoutSettings, SCOUT_PRESETS, MODE_PRESETS, getScoutingMode } from '@/lib/scoutSettings';
import { ReceptionFormationEditor } from '@/components/scout/ReceptionFormationEditor';
import { cn } from '@/lib/utils';

const RILEVAZIONE_ROWS = [
  { key: 'singleTeamMode' as const, label: '👤 Rileva una sola squadra', description: 'Riduce il carico cognitivo: rileva solo la tua squadra, l\'avversaria si gestisce con "Punto".' },
  { key: 'followServe' as const, label: '🔄 Segui servizio', description: 'Pre-seleziona automaticamente la squadra dopo ogni azione: S→riceve avversaria, R/E→stessa squadra. Risparmia 1 tap per azione.' },
  { key: 'showServeType' as const, label: 'Tipo battuta', description: 'Mostra lo step per scegliere il tipo di servizio.' },
  { key: 'showAttackCombo' as const, label: 'Combo attacco', description: 'Mostra lo step per la combinazione di attacco.' },
  { key: 'showStartZone' as const, label: 'Zona origine', description: 'Richiede la zona di partenza dell\'azione (2-tap traiettoria).' },
  { key: 'showEndZone' as const, label: 'Zona destinazione', description: 'Richiede la zona di arrivo dell\'azione.' },
  { key: 'showAlzata' as const, label: 'Skill E', description: 'Mostra Alzata nella lista fondamentali.' },
  { key: 'showDifesa' as const, label: 'Skill D', description: 'Mostra Difesa nella lista fondamentali.' },
  { key: 'showFreeball' as const, label: 'Skill F', description: 'Mostra Freeball nella lista fondamentali.' },
  { key: 'autoPoint' as const, label: 'Punto automatico', description: 'Aggiunge punto automatico su # per A/S/B e su errore.' },
  { key: 'autoCorrelation' as const, label: 'Correlazione automatica', description: 'Aggiorna automaticamente battuta/ricezione e attacco/muro' },
  { key: 'showMuroVincente' as const, label: 'Muro vincente', description: 'Rileva chi fa muro punto' },
  { key: 'showMuroErrato' as const, label: 'Muro errato', description: 'Rileva chi commette errore a muro' },
  { key: 'sostituzioniLibere' as const, label: 'Sostituzioni libere', description: 'Senza vincoli regolamento (beach/giovanili).' },
  { key: 'showServeStartZone' as const, label: 'Area di battuta (2-tap)', description: 'Chiedi zona di partenza del servizio (1/5/6) prima del tipo battuta.' },
  { key: 'showRallyHistory' as const, label: 'Mostra storico rally', description: 'Striscia orizzontale con le ultime azioni sotto al campo.' },
  { key: 'comboChain' as const, label: '🔗 Combo chain', description: 'Dopo un\'azione non terminale mantiene squadra+giocatore selezionati → salta direttamente alla scelta del fondamentale.' },
  { key: 'keyboardShortcuts' as const, label: '⌨ Scorciatoie tastiera', description: 'Numeri = giocatore/zona, S R A B D E F = skill, # + - = / ! = valutazione, H/V = squadra, Esc = indietro.' },
];

const VISUAL_ROWS = [
  { key: 'showAllDirections' as const, label: 'Tutte le direzioni', description: 'Mostra tutte le direzioni disponibili.' },
  { key: 'posizionaPerRuolo' as const, label: 'Posiziona per ruolo', description: 'Giocatori in posizione tattica dopo ricezione' },
  { key: 'fastMode' as const, label: '⚡ Fast Mode', description: 'Ritorno immediato dopo ogni azione' },
];

export function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
      <div>
        <div className="text-sm font-black text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ScoutSettingsPanel({ settings, setSetting, setSettings }: { settings: ScoutSettings; setSetting: <K extends keyof ScoutSettings>(key: K, value: ScoutSettings[K]) => void; setSettings: (patch: Partial<ScoutSettings>) => void }) {
  const [receptionEditorOpen, setReceptionEditorOpen] = useState(false);
  const PRESETS = [
    { key: 'base' as const, label: '⚡ Base', desc: 'Veloce\nniente zone' },
    { key: 'standard' as const, label: '📊 Standard', desc: 'Con zone\ne fondamentali' },
    { key: 'avanzato' as const, label: '🏆 Pro', desc: 'Tutto\nattivato' },
  ];
  return (
    <div className="mt-4 space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Preset rapido</h3>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => { setSettings(SCOUT_PRESETS[p.key]); toast.success(`Preset ${p.label} applicato`); }}
              className="min-h-16 rounded-xl border-2 border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 p-2"
            >
              <span className="text-sm font-black text-foreground">{p.label}</span>
              <span className="text-[10px] text-muted-foreground whitespace-pre-line text-center leading-tight">{p.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Rilevazione</h3>
        <div className="space-y-3">
          {RILEVAZIONE_ROWS.map((row) => <SettingRow key={row.key} label={row.label} description={row.description} checked={settings[row.key]} onChange={(checked) => setSetting(row.key, checked)} />)}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Valori predefiniti</h3>
        <div className="grid gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <Select value={settings.attaccoPredefinito} onValueChange={(v) => setSetting('attaccoPredefinito', v as ScoutSettings['attaccoPredefinito'])}>
            <SelectTrigger><SelectValue placeholder="Attacco predefinito" /></SelectTrigger>
            <SelectContent><SelectItem value="H">H — Alta</SelectItem><SelectItem value="Q">Q — Veloce</SelectItem><SelectItem value="T">T — Tesa</SelectItem></SelectContent>
          </Select>
          <Select value={settings.ricezionePredefinita} onValueChange={(v) => setSetting('ricezionePredefinita', v as ScoutSettings['ricezionePredefinita'])}>
            <SelectTrigger><SelectValue placeholder="Ricezione predefinita" /></SelectTrigger>
            <SelectContent>{(['#', '+', '!', '-', '/', '='] as const).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>
      {settings.keyboardShortcuts && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Guida shortcuts tastiera
          </h3>
          <div className="space-y-1.5 rounded-xl border border-border bg-secondary/40 p-4 text-xs">
            {([
              ['H / V', 'Casa / Ospite'],
              ['1–99', 'Numero maglia (auto-commit)'],
              ['S R A B', 'Battuta / Ricezione / Attacco / Muro'],
              ['D E F', 'Difesa / Alzata / Freeball'],
              ['# + ! - / =', 'Valutazione'],
              ['1–9', 'Zona'],
              ['Esc', 'Indietro'],
              ['Enter', 'Conferma giocatore'],
            ] as [string, string][]).map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono font-bold text-[11px] text-primary">
                  {key}
                </kbd>
                <span className="text-muted-foreground text-right">{desc}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Visualizzazione</h3>
        <div className="space-y-3">
          {VISUAL_ROWS.map((row) => <SettingRow key={row.key} label={row.label} description={row.description} checked={settings[row.key]} onChange={(checked) => setSetting(row.key, checked)} />)}
        </div>
      </section>
      <button
        type="button"
        onClick={() => setReceptionEditorOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-sm font-bold hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Move className="w-4 h-4" />
          Schemi ricezione / attacco
        </span>
        <span className="text-xs text-muted-foreground">S1 → S6</span>
      </button>
      <ReceptionFormationEditor open={receptionEditorOpen} onOpenChange={setReceptionEditorOpen} />
      <button
        type="button"
        onClick={() => { localStorage.removeItem('scout_seen_tips'); toast.info('Suggerimenti ripristinati'); }}
        className="w-full min-h-10 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        🔄 Ripristina suggerimenti
      </button>
    </div>
  );
}
