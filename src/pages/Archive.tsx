import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FileUp, Users } from 'lucide-react';

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

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

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
          {matches.length === 0 && (
            <Card className="p-8 text-center">
              <FileUp className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Nessuna partita importata.</p>
              <Link to="/import" className="inline-block px-4 py-2 rounded bg-primary text-primary-foreground font-bold uppercase text-sm">Importa il primo .dvw</Link>
            </Card>
          )}
          {matches.map(m => (
            <Link key={m.id} to={`/match/${m.id}`} className="block">
              <Card className="p-4 hover:border-primary transition-colors">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-bold uppercase italic">
                      {m.home_team.name} <span className="text-primary">{m.home_sets_won}-{m.away_sets_won}</span> {m.away_team.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.match_date} · {m.league}</p>
                  </div>
                  <span className="text-primary font-bold">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black italic uppercase mb-2">Squadre</h2>
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna squadra ancora.</p>
          )}
          {teams.map(t => (
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
