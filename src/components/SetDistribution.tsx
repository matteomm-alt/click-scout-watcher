import { useMemo, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { ROLE_LABELS } from '@/types/volleyball';

type TeamFilter = 'home' | 'away';

interface SetterRow {
  setterNumber: number;
  setterName: string;
  zoneCounts: Record<number, number>; // 1-6 → set count (using attack startZone as proxy)
  zoneKills: Record<number, number>;
  total: number;
}

interface RotationDistributionRow {
  rotation: number;
  total: number;
  counts: Record<'left' | 'middle' | 'right' | 'back', number>;
}

const setTargetGroups = [
  { key: 'left', label: 'Z4', zones: [4], className: 'bg-opponent' },
  { key: 'middle', label: 'Z3', zones: [3], className: 'bg-accent' },
  { key: 'right', label: 'Z2', zones: [2], className: 'bg-primary' },
  { key: 'back', label: '2ª', zones: [1, 5, 6], className: 'bg-sidebar-primary' },
] as const;

/**
 * Heuristic: "set distribution" is inferred from where attacks STARTED.
 * For each attack action, we attribute the set to the setter currently in lineup.
 * (No explicit "set" action recorded yet → this is the best estimate from existing data.)
 */
export function SetDistribution() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  const [team, setTeam] = useState<TeamFilter>('home');

  const rows = useMemo<SetterRow[]>(() => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const map = new Map<number, SetterRow>();

    // Identify setters in roster
    teamData.players.filter((p) => p.role === 'S').forEach((p) => {
      map.set(p.number, {
        setterNumber: p.number,
        setterName: p.lastName,
        zoneCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        zoneKills: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        total: 0,
      });
    });

    for (const a of matchState.actions) {
      if (a.team !== team) continue;
      if (a.skill !== 'A') continue;
      const sz = a.startZone;
      if (!sz || sz < 1 || sz > 6) continue;

      // Find setter on court at the time of the action
      const setterPos = a.homeSetterPosition; // we'll switch below
      const lineup = a.homeLineup;
      const correctPos = team === 'home' ? a.homeSetterPosition : a.awaySetterPosition;
      const correctLineup = team === 'home' ? a.homeLineup : a.awayLineup;
      void setterPos; void lineup;
      const setterNum = correctLineup[correctPos - 1];
      if (!setterNum) continue;

      let row = map.get(setterNum);
      if (!row) {
        const player = teamData.players.find((p) => p.number === setterNum);
        row = {
          setterNumber: setterNum,
          setterName: player?.lastName || `#${setterNum}`,
          zoneCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          zoneKills: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          total: 0,
        };
        map.set(setterNum, row);
      }
      row.zoneCounts[sz] = (row.zoneCounts[sz] || 0) + 1;
      if (a.evaluation === '#') row.zoneKills[sz] = (row.zoneKills[sz] || 0) + 1;
      row.total++;
    }

    return Array.from(map.values()).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [matchState.actions, team, homeTeam, awayTeam]);

  const rotationRows = useMemo<RotationDistributionRow[]>(() => {
    const base = Array.from({ length: 6 }, (_, index) => ({
      rotation: index + 1,
      total: 0,
      counts: { left: 0, middle: 0, right: 0, back: 0 },
    }));

    for (const a of matchState.actions) {
      if (a.team !== team || a.skill !== 'E' || !a.endZone) continue;
      const rotation = team === 'home' ? a.homeSetterPosition : a.awaySetterPosition;
      if (rotation < 1 || rotation > 6) continue;
      const row = base[rotation - 1];
      const group = setTargetGroups.find((g) => g.zones.includes(a.endZone));
      if (!group) continue;
      row.counts[group.key]++;
      row.total++;
    }

    return base;
  }, [matchState.actions, team]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Distribuzione Alzata · {ROLE_LABELS.S}
        </h4>
      </div>

      {/* Team toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-secondary/40 border border-border/50">
        {(['home', 'away'] as const).map((k) => {
          const active = team === k;
          const cls = active
            ? k === 'home' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary';
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTeam(k)}
              className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors truncate ${cls}`}
            >
              {(k === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite').slice(0, 14)}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-3">
          Nessuna alzata registrata
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const max = Math.max(...Object.values(r.zoneCounts), 1);
            return (
              <div key={r.setterNumber} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-warning">#{r.setterNumber}</span>
                    <span className="text-foreground truncate max-w-[100px]">{r.setterName}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{r.total} alz.</span>
                </div>

                {/* Front row */}
                <div className="grid grid-cols-3 gap-1">
                  {[4, 3, 2].map((z) => {
                    const c = r.zoneCounts[z] || 0;
                    const k = r.zoneKills[z] || 0;
                    const pct = c > 0 ? Math.round((k / c) * 100) : 0;
                    const intensity = c / max;
                    return (
                      <div
                        key={z}
                        className="rounded p-1 border border-border/50 text-center"
                        style={{
                          backgroundColor: c === 0 ? 'transparent' : `hsl(var(--primary) / ${(0.1 + intensity * 0.5).toFixed(2)})`,
                        }}
                      >
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Z{z}</div>
                        <div className="text-sm font-bold text-foreground tabular-nums">{c}</div>
                        {c > 0 && (
                          <div className={`text-[9px] font-bold tabular-nums ${
                            pct >= 50 ? 'text-emerald-400' : pct >= 30 ? 'text-warning' : 'text-destructive'
                          }`}>
                            {pct}% K
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Back row */}
                <div className="grid grid-cols-3 gap-1">
                  {[5, 6, 1].map((z) => {
                    const c = r.zoneCounts[z] || 0;
                    const k = r.zoneKills[z] || 0;
                    const pct = c > 0 ? Math.round((k / c) * 100) : 0;
                    const intensity = c / max;
                    return (
                      <div
                        key={z}
                        className="rounded p-1 border border-border/50 text-center"
                        style={{
                          backgroundColor: c === 0 ? 'transparent' : `hsl(var(--primary) / ${(0.1 + intensity * 0.5).toFixed(2)})`,
                        }}
                      >
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Z{z}</div>
                        <div className="text-sm font-bold text-foreground tabular-nums">{c}</div>
                        {c > 0 && (
                          <div className={`text-[9px] font-bold tabular-nums ${
                            pct >= 50 ? 'text-emerald-400' : pct >= 30 ? 'text-warning' : 'text-destructive'
                          }`}>
                            {pct}% K
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[9px] text-muted-foreground italic">
        * Inferita dalla zona di partenza degli attacchi e dal setter in posizione
      </div>
    </div>
  );
}
