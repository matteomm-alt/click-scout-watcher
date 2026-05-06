import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileUp, Users, Trash2 } from 'lucide-react';

interface MatchListItem {
  id: string;
  match_date: string | null;
  league: string | null;
  home_sets_won: number;
  away_sets_won: number;
  source_filename: string | null;
  home_team: { name: string };
  away_team: { name: string };
}

interface TeamListItem {
  id: string;
  name: string;
  is_own_team: boolean;
  city: string | null;
}

export default function Archive() {
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('scout_matches')
        .select(`id, match_date, league, home_sets_won, away_sets_won, source_filename,
                 home_team:home_team_id(name), away_team:away_team_id(name)`)
        .order('match_date', { ascending: false });
      setMatches((m as any) || []);
      const { data: t } = await supabase
        .from('scout_teams')
        .select('id,name,is_own_team,city')
        .order('name');
      setTeams(t || []);
      setLoading(false);
    })();
  }, []);

  const filtered = matches.filter((m) => {
    const text = `${m.home_team?.name ?? ''} ${m.away_team?.name ?? ''} ${m.league ?? ''}`.toLowerCase();
    return (
      (!search || text.includes(search.toLowerCase())) &&
      (!filterLeague || m.league === filterLeague) &&
      (!filterYear || (m.match_date ?? '').startsWith(filterYear))
    );
  });

  const leagues = [...new Set(matches.map((m) => m.league).filter(Boolean))] as string[];
  const years = [...new Set(matches.map((m) => m.match_date?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[];

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="border-b border-border/60">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold uppercase italic tracking-tight">Archivio</h1>
        </div>
      </header>

      <div className="container py-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-2xl font-black italic uppercase mb-2">Partite importate</h2>

          <div className="flex flex-wrap gap-2 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca squadra, campionato..."
              className="flex-1 min-w-40 min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
            />
            <select
              value={filterLeague}
              onChange={(e) => setFilterLeague(e.target.value)}
              className="min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
            >
              <option value="">Tutti i campionati</option>
              {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="min-h-10 rounded-lg bg-muted/50 border border-border px-3 text-sm"
            >
              <option value="">Tutti gli anni</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}

          {!loading && filtered.length === 0 && (
            <Card className="p-8 text-center">
              <FileUp className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {matches.length === 0 ? 'Nessuna partita importata.' : 'Nessun risultato per questi filtri.'}
              </p>
              {matches.length === 0 && (
                <Link to="/import" className="inline-block px-4 py-2 rounded bg-primary text-primary-foreground font-bold uppercase text-sm">
                  Importa il primo .dvw
                </Link>
              )}
            </Card>
          )}

          {!loading && filtered.map((m) => (
            <div key={m.id} className="flex items-stretch gap-2">
              <Link to={`/match/${m.id}`} className="block flex-1">
                <Card className="p-4 hover:border-primary transition-colors h-full">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="font-bold uppercase italic">
                        {m.home_team?.name} <span className="text-primary">{m.home_sets_won}-{m.away_sets_won}</span> {m.away_team?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.match_date} · {m.league}</p>
                    </div>
                    <span className="text-primary font-bold">→</span>
                  </div>
                </Card>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="px-3 rounded-lg border border-border hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare questa partita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tutte le azioni DVW associate verranno cancellate definitivamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        await supabase.from('scout_matches').delete().eq('id', m.id);
                        setMatches((prev) => prev.filter((x) => x.id !== m.id));
                        toast.success('Partita eliminata');
                      }}
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black italic uppercase mb-2">Squadre</h2>
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna squadra ancora.</p>
          )}
          {teams.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.name}</p>
                  {t.city && <p className="text-xs text-muted-foreground">{t.city}</p>}
                </div>
                {t.is_own_team && <span className="text-[10px] uppercase font-bold text-primary">Mia</span>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
