import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { ActionPanel } from '@/components/ActionPanel';
import { useMatchStore } from '@/store/matchStore';
import { SKILL_LABELS, EVALUATION_LABELS } from '@/types/volleyball';

export function LiveScout() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  const recentActions = [...matchState.actions].reverse().slice(0, 12);

  return (
    <div className="h-screen flex flex-col p-3 gap-3 overflow-hidden">
      {/* Scoreboard */}
      <ScoreBoard />

      {/* Main area */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Court - left */}
        <div className="col-span-4 min-h-0 overflow-hidden flex flex-col">
          <VolleyballCourt />
        </div>

        {/* Actions - center */}
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

        {/* Log - right */}
        <div className="col-span-3 min-h-0 overflow-hidden">
          <div className="glass rounded-xl p-3 h-full flex flex-col">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Azioni ({matchState.actions.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {recentActions.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4">
                  Nessuna azione registrata
                </div>
              )}
              {recentActions.map((action) => {
                const teamName = action.team === 'home' ? homeTeam.name : awayTeam.name;
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 text-xs"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      action.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                    }`} />
                    <span className="font-mono text-primary font-bold">#{action.playerNumber}</span>
                    <span className="text-muted-foreground">{SKILL_LABELS[action.skill]}</span>
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
                );
              })}
            </div>

            {/* Set results */}
            {matchState.setResults.length > 0 && (
              <div className="border-t border-border mt-2 pt-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Set</div>
                {matchState.setResults.map((sr, i) => (
                  <div key={i} className="flex justify-between text-xs text-foreground">
                    <span>Set {i + 1}</span>
                    <span className="font-bold">{sr.homeScore} - {sr.awayScore}</span>
                  </div>
                ))}
              </div>
            )}
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
