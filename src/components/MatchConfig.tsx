import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Move,
  Zap, BarChart2, ChevronDown, ChevronUp, Settings,
} from 'lucide-react';
import { useMatchStore } from '@/store/matchStore';
import {
  useScoutSettings, SCOUT_PRESETS, type ScoutSettings,
} from '@/lib/scoutSettings';
import { ReceptionFormationEditor } from '@/components/scout/ReceptionFormationEditor';
import { cn } from '@/lib/utils';

const MODE_SIMPLE: Partial<ScoutSettings> = {
  showAlzata: false, showDifesa: false, showFreeball: false,
  showServeType: false, showAttackCombo: false,
  showStartZone: false, showEndZone: false,
  fastMode: true, autoPoint: true,
};
const MODE_ADVANCED: Partial<ScoutSettings> = {
  showAlzata: true, showDifesa: true, showFreeball: true,
  showServeType: true, showAttackCombo: true,
  showStartZone: true, showEndZone: true,
  fastMode: false, autoPoint: true,
};

function getMode(s: ScoutSettings): 'simple' | 'advanced' | 'custom' {
  if (!s.showAlzata && !s.showDifesa && !s.showFreeball) return 'simple';
  if (s.showAlzata && s.showDifesa && s.showFreeball) return 'advanced';
  return 'custom';
}

export function MatchConfig() {
  const {
    homeTeam, awayTeam, matchState,
    setStep, startMatch, setServingTeam,
  } = useMatchStore();
  const { settings, setSetting, setSettings } = useScoutSettings();
  const [receptionEditorOpen, setReceptionEditorOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const currentMode = getMode(settings);

  const handleStart = () => {
    startMatch();
    setStep('scout');
  };

  const TOGGLE_ROWS: { key: keyof ScoutSettings; label: string }[] = [
    { key: 'showAlzata',      label: 'Alzata (E)' },
    { key: 'showDifesa',      label: 'Difesa (D)' },
    { key: 'showFreeball',    label: 'Freeball (F)' },
    { key: 'showServeType',   label: 'Tipo battuta' },
    { key: 'showAttackCombo', label: 'Combo attacco' },
    { key: 'showStartZone',   label: 'Zona partenza' },
    { key: 'showEndZone',     label: 'Zona caduta' },
    { key: 'autoPoint',       label: 'Punto automatico (ace/errore)' },
    { key: 'fastMode',        label: '⚡ Fast Mode' },
  ];

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('lineup')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Formazione
        </button>
        <h1 className="text-xl font-black uppercase tracking-wider">Pre-partita</h1>
        <button
          onClick={handleStart}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all">
          Inizia <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ① Chi serve */}
      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          ① Chi serve per primo
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(['home', 'away'] as const).map(t => (
            <button
              key={t}
              onClick={() => setServingTeam(t)}
              className={cn(
                'py-3.5 rounded-xl border-2 font-black uppercase text-sm tracking-wide transition-all active:scale-95',
                matchState.servingTeam === t
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/40',
              )}>
              {matchState.servingTeam === t ? '🏐 ' : ''}
              {t === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}
            </button>
          ))}
        </div>
      </section>

      {/* ② Modalità scouting */}
      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          ② Modalità scouting
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: 'simple' as const, Icon: Zap, label: 'Semplice', desc: 'Solo S·R·A·B', preset: MODE_SIMPLE },
            { mode: 'advanced' as const, Icon: BarChart2, label: 'Avanzato', desc: 'DVW completo', preset: MODE_ADVANCED },
          ].map(({ mode, Icon, label, desc, preset }) => (
            <button
              key={mode}
              onClick={() => setSettings(preset)}
              className={cn(
                'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all active:scale-95',
                currentMode === mode
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/40',
              )}>
              <Icon className="w-5 h-5" />
              <span className="text-sm font-black uppercase">{label}</span>
              <span className="text-[10px] opacity-75">{desc}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1">
          {(['base', 'standard', 'avanzato'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSettings(SCOUT_PRESETS[k])}
              className="py-2 rounded-lg border border-border bg-secondary/20 text-xs font-bold hover:border-primary/40 transition-all active:scale-95 capitalize">
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-secondary/10 text-xs font-bold text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            Personalizza opzioni singole
          </span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="space-y-1 pt-1">
            {TOGGLE_ROWS.map(row => (
              <div key={row.key} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-secondary/10">
                <span className="text-xs font-bold">{row.label}</span>
                <button
                  onClick={() => setSetting(row.key, !settings[row.key] as never)}
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative',
                    settings[row.key] ? 'bg-primary' : 'bg-border',
                  )}>
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                      settings[row.key] ? 'left-[18px]' : 'left-0.5',
                    )} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ③ Schemi di gioco */}
      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          ③ Schemi di gioco
        </h2>
        <button
          onClick={() => setReceptionEditorOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-secondary/20 hover:border-primary/40 hover:bg-primary/5 transition-all">
          <span className="flex items-center gap-3">
            <Move className="w-5 h-5 text-primary" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-bold">Schemi ricezione / attacco / difesa</span>
              <span className="text-[11px] text-muted-foreground">
                S1→S6 per tutte le fasi · Carica template
              </span>
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <ReceptionFormationEditor open={receptionEditorOpen} onOpenChange={setReceptionEditorOpen} />
      </section>

      <div className="pt-4">
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-base hover:brightness-110 transition-all active:scale-[0.98]">
          🏐 Inizia partita
        </button>
      </div>
    </div>
  );
}
