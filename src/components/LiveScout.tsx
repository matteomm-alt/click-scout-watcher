import { useState } from 'react';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { ActionPanel } from '@/components/ActionPanel';
import { AttackHeatmap } from '@/components/AttackHeatmap';
import { PlayerStatsPanel } from '@/components/PlayerStatsPanel';
import { QuickActions } from '@/components/QuickActions';
import { TeamComparison } from '@/components/TeamComparison';
import { SetDistribution } from '@/components/SetDistribution';
import { useMatchStore } from '@/store/matchStore';
import { SKILL_LABELS, SERVE_TYPES } from '@/types/volleyball';

type RightTab = 'log' | 'stats' | 'heat' | 'compare' | 'sets';

const TABS: { key: RightTab; label: string }[] = [
  { key: 'log', label: 'Log' },
  { key: 'stats', label: 'Stats' },
  { key: 'heat', label: 'Heat' },
  { key: 'compare', label: 'VS' },
  { key: 'sets', label: 'Alz.' },
];

export function LiveScout() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  const [tab, setTab] = useState<RightTab>('log');
  const recentActions = [...matchState.actions].reverse().slice(0, 30);

  return (
    <div className="h-screen flex flex-col p-3 gap-3 overflow-hidden">
      <ScoreBoard />

      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Court + Quick Actions - left */}
        <div className="col-span-4 min-h-0 overflow-hidden flex flex-col gap-3">
          <VolleyballCourt />
          <div className="glass rounded-xl p-3 flex-1 min-h-0 overflow-y-auto">
            <QuickActions />
          </div>
        </div>

        {/* Action Panel - center */}
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

        {/* Right column with tabs */}
        <div className="col-span-3 min-h-0 overflow-hidden">
          <div className="glass rounded-xl p-3 h-full flex flex-col">
            {/* Tab bar */}
            <div className="grid grid-cols-5 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50 mb-2">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === 'log' && (
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
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          action.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
                        <span className="font-mono text-primary font-bold">#{action.playerNumber}</span>
                        <span className="text-muted-foreground">{SKILL_LABELS[action.skill]}</span>
                        {action.attackCode && (
                          <span className="text-red-300/70 text-[10px] font-mono font-bold">{action.attackCode}</span>
                        )}
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
              )}

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
  );
}
