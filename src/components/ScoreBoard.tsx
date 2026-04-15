import { useMatchStore } from '@/store/matchStore';

export function ScoreBoard() {
  const { homeTeam, awayTeam, matchState } = useMatchStore();

  return (
    <div className="glass rounded-xl px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Casa</div>
          <div className="text-lg font-bold text-foreground truncate max-w-[120px]">
            {homeTeam.name || 'Casa'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Set</span>
          <span className="text-xl font-bold text-primary">{matchState.homeSetsWon}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`text-5xl font-black tabular-nums transition-all ${
          matchState.servingTeam === 'home' ? 'text-primary' : 'text-foreground'
        }`}>
          {matchState.homeScore}
        </div>
        <div className="text-2xl text-muted-foreground font-light">:</div>
        <div className={`text-5xl font-black tabular-nums transition-all ${
          matchState.servingTeam === 'away' ? 'text-primary' : 'text-foreground'
        }`}>
          {matchState.awayScore}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">{matchState.awaySetsWon}</span>
          <span className="text-xs text-muted-foreground">Set</span>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Ospite</div>
          <div className="text-lg font-bold text-foreground truncate max-w-[120px]">
            {awayTeam.name || 'Ospite'}
          </div>
        </div>
      </div>

      <div className="ml-4 text-center">
        <div className="text-xs text-muted-foreground">Set</div>
        <div className="text-2xl font-bold text-primary">{matchState.currentSet}</div>
      </div>

      {matchState.servingTeam && (
        <div className="ml-2">
          <div className="text-xs text-muted-foreground">Battuta</div>
          <div className="text-sm font-semibold text-primary">
            {matchState.servingTeam === 'home' ? '←' : '→'}
          </div>
        </div>
      )}
    </div>
  );
}
