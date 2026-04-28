import { useState } from 'react';
import { BarChart2, Settings, Target, Zap } from 'lucide-react';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { ActionPanel } from '@/components/ActionPanel';
import { AttackHeatmap } from '@/components/AttackHeatmap';
import { PlayerStatsPanel } from '@/components/PlayerStatsPanel';
import { QuickActions } from '@/components/QuickActions';
import { TeamComparison } from '@/components/TeamComparison';
import { SetDistribution } from '@/components/SetDistribution';
import { FullscreenToggle } from '@/components/FullscreenToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useScoutSettings } from '@/lib/scoutSettings';
import { useMatchStore } from '@/store/matchStore';
import { SKILL_LABELS, SERVE_TYPES } from '@/types/volleyball';

type RightTab = 'log' | 'stats' | 'heat' | 'compare' | 'sets';
type MobileTab = 'scout' | 'quick' | 'live';

const TABS: { key: RightTab; label: string }[] = [
  { key: 'log', label: 'Log' },
  { key: 'stats', label: 'Stats' },
  { key: 'heat', label: 'Heat' },
  { key: 'compare', label: 'VS' },
  { key: 'sets', label: 'Alz.' },
];

const MOBILE_TABS = [
  { key: 'scout' as const, label: 'Scout', icon: Target },
  { key: 'quick' as const, label: 'Quick', icon: Zap },
  { key: 'live' as const, label: 'Live', icon: BarChart2 },
];

const SETTING_ROWS = [
  { key: 'showServeType' as const, label: 'Tipo battuta', description: 'Mostra lo step per scegliere il tipo di servizio.' },
  { key: 'showAttackCombo' as const, label: 'Combo attacco', description: 'Mostra lo step per la combinazione di attacco.' },
  { key: 'showStartZone' as const, label: 'Zona origine', description: 'Richiede la zona di partenza dell’azione.' },
  { key: 'showEndZone' as const, label: 'Zona destinazione', description: 'Richiede la zona di arrivo dell’azione.' },
  { key: 'showAlzata' as const, label: 'Skill E', description: 'Mostra Alzata nella lista fondamentali.' },
  { key: 'showDifesa' as const, label: 'Skill D', description: 'Mostra Difesa nella lista fondamentali.' },
  { key: 'showFreeball' as const, label: 'Skill F', description: 'Mostra Freeball nella lista fondamentali.' },
  { key: 'autoPoint' as const, label: 'Punto automatico', description: 'Aggiunge punto automatico su # per A/S/B e su errore.' },
];

export function LiveScout() {
  const { matchState, homeTeam, awayTeam, endSet } = useMatchStore();
  const { settings, setSetting } = useScoutSettings();
  const [tab, setTab] = useState<RightTab>('log');
  const [mobileTab, setMobileTab] = useState<MobileTab>('scout');
  const recentActions = [...matchState.actions].reverse().slice(0, 30);

  const ActionLog = () => (
    <>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
        Azioni ({matchState.actions.length})
      </div>
      <div className="space-y-1">
        {recentActions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-4">
            Nessuna azione registrata
          </div>
        )}
        {recentActions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 text-xs"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${action.team === 'home' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span className="font-mono text-primary font-bold">#{action.playerNumber}</span>
            <span className="text-muted-foreground">{SKILL_LABELS[action.skill]}</span>
            {action.attackCode && <span className="text-red-300/70 text-[10px] font-mono font-bold">{action.attackCode}</span>}
            {action.serveType && (
              <span className="text-blue-300/70 text-[10px] font-bold">
                {SERVE_TYPES.find(s => s.key === action.serveType)?.label || action.serveType}
              </span>
            )}
            <span className={`font-bold ${
              action.evaluation === '#' || action.evaluation === '+' ? 'text-accent' :
              action.evaluation === '=' || action.evaluation === '/' ? 'text-destructive' :
              'text-warning'
            }`}>
              {action.evaluation}
            </span>
            {(action.startZone || action.endZone) && (
              <span className="text-primary/60 text-[10px] font-mono">
                {action.startZone || '?'}→{action.endZone || '?'}
              </span>
            )}
            <span className="text-muted-foreground/50 ml-auto text-[10px]">{action.timestamp}</span>
          </div>
        ))}
      </div>

      {matchState.setResults.length > 0 && (
        <div className="border-t border-border mt-3 pt-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Set</div>
          {matchState.setResults.map((sr, i) => (
            <div key={i} className="flex justify-between text-xs text-foreground">
              <span>Set {i + 1}</span>
              <span className="font-bold">{sr.homeScore} - {sr.awayScore}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen flex-col p-3 gap-3 overflow-hidden">
        <FullscreenToggle />
        <ScoreBoard />

        <div className="flex-shrink-0">
          <VolleyballCourt />
        </div>

        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          <div className="col-span-3 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-3 h-full overflow-y-auto">
              <QuickActions />
            </div>
          </div>

          <div className="col-span-5 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-4 h-full flex flex-col">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Inserimento Azione
              </h3>
              <div className="flex-1 overflow-y-auto">
                <ActionPanel />
              </div>
            </div>
          </div>

          <div className="col-span-3 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-3 h-full flex flex-col">
              <div className="grid grid-cols-5 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50 mb-2">
                {TABS.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors active:scale-95 ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto">
                {tab === 'log' && <ActionLog />}
                {tab === 'stats' && <PlayerStatsPanel />}
                {tab === 'heat' && <AttackHeatmap team="all" />}
                {tab === 'compare' && <TeamComparison />}
                {tab === 'sets' && <SetDistribution />}
              </div>
            </div>
          </div>
        </div>

        {matchState.isMatchEnded && (
          <div className="glass rounded-xl p-4 text-center">
            <h2 className="text-2xl font-bold text-primary">Partita Terminata</h2>
            <p className="text-foreground text-lg">
              {homeTeam.name} {matchState.homeSetsWon} - {matchState.awaySetsWon} {awayTeam.name}
            </p>
          </div>
        )}
      </div>

      <div className="lg:hidden h-screen flex flex-col p-2 gap-2 overflow-hidden pb-20">
        <ScoreBoard />

        {mobileTab === 'scout' && (
          <div className="flex max-h-40 shrink-0 overflow-hidden">
            <VolleyballCourt />
          </div>
        )}

        {mobileTab === 'scout' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={endSet}
              className="min-h-14 px-6 rounded-xl bg-secondary text-warning font-black border border-warning/40 transition-transform duration-75 active:scale-95"
            >
              ⏭ Fine Set
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="ml-auto min-h-14 w-14 rounded-xl bg-secondary text-foreground font-black transition-transform duration-75 active:scale-95"
                  aria-label="Impostazioni scout"
                >
                  <Settings className="mx-auto h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Impostazioni scout</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  {SETTING_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
                      <div>
                        <div className="text-sm font-black text-foreground">{row.label}</div>
                        <div className="text-xs text-muted-foreground">{row.description}</div>
                      </div>
                      <Switch checked={settings[row.key]} onCheckedChange={(checked) => setSetting(row.key, checked)} />
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto glass rounded-xl p-3">
          {mobileTab === 'scout' && <ActionPanel />}
          {mobileTab === 'quick' && <QuickActions />}
          {mobileTab === 'live' && (
            <div className="space-y-4">
              <ActionLog />
              <PlayerStatsPanel />
              <AttackHeatmap team="all" />
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-1 border-t border-border bg-background/95 p-2 backdrop-blur">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = mobileTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMobileTab(item.key)}
                className={`min-h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all duration-75 active:scale-95 ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
