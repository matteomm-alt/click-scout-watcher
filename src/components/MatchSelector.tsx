import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface MatchListItem {
  id: string;
  match_date: string | null;
  league: string | null;
  home_sets_won: number;
  away_sets_won: number;
  home_team: { name: string };
  away_team: { name: string };
  action_count?: number;
}

interface Props {
  currentMatchId?: string;         // partita aperta da URL — preselezionata
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

export function MatchSelector({ currentMatchId, selectedIds, onChange }: Props) {
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, home_sets_won, away_sets_won,
                 home_team:home_team_id(name), away_team:away_team_id(name)`)
        .order('match_date', { ascending: false });
      const list = ((data as any) || []) as MatchListItem[];
      const counts = await Promise.all(
        list.map(async (m) => {
          const { count } = await supabase
            .from('scout_actions')
            .select('id', { count: 'exact', head: true })
            .eq('scout_match_id', m.id);
          return [m.id, count || 0] as const;
        })
      );
      const countMap = new Map(counts);
      setMatches(list.map(m => ({ ...m, action_count: countMap.get(m.id) || 0 })));
      // Prima volta: preseleziona la partita corrente
      if (currentMatchId && selectedIds.size === 0) {
        onChange(new Set([currentMatchId]));
      }
    })();
  }, [currentMatchId]);

  const selectAll = () => onChange(new Set(matches.map(m => m.id)));
  const selectNone = () => onChange(new Set(currentMatchId ? [currentMatchId] : []));
  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const label = () => {
    if (selectedIds.size === 0) return 'Nessuna gara';
    if (selectedIds.size === matches.length && matches.length > 0) return `Tutte le gare (${matches.length})`;
    if (selectedIds.size === 1) {
      const m = matches.find(m => selectedIds.has(m.id));
      if (m) return `${m.home_team.name} vs ${m.away_team.name} · ${m.match_date || ''}`;
    }
    return `${selectedIds.size} gare selezionate`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold hover:border-primary transition-colors"
      >
        <span className="text-foreground truncate">{label()}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Azioni rapide */}
          <div className="flex gap-1 p-2 border-b border-border">
            <button onClick={selectAll}
              className="flex-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold">
              Tutte
            </button>
            <button onClick={selectNone}
              className="flex-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground font-semibold">
              Solo corrente
            </button>
          </div>

          {/* Lista partite */}
          <div className="max-h-64 overflow-y-auto">
            {matches.map(m => {
              const sel = selectedIds.has(m.id);
              const isCurrent = m.id === currentMatchId;
              return (
                <button key={m.id} onClick={() => toggle(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${isCurrent ? 'bg-primary/5' : ''}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-border'}`}>
                    {sel && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {m.home_team.name} <span className="text-primary">{m.home_sets_won}-{m.away_sets_won}</span> {m.away_team.name}
                      <span className="ml-1 text-[10px] text-muted-foreground">· {m.action_count ?? 0} az.</span>
                      {isCurrent && <span className="ml-1 text-[10px] text-primary opacity-60">(corrente)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{m.match_date || '—'} · {m.league || ''}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-border text-center">
            <button onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline font-semibold">
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
