import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PublicMatch {
  id: string;
  match_date: string | null;
  league: string | null;
  home_sets_won: number;
  away_sets_won: number;
  home_team_name: string | null;
  away_team_name: string | null;
}

export default function AnalisiPubblica() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !token) {
      setError('Link non valido');
      setLoading(false);
      return;
    }
    supabase
      .rpc('get_public_shared_match', { _match_id: matchId, _token: token })
      .then(({ data, error: e }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (e || !row) setError('Link non valido o scaduto.');
        else setMatch(row as PublicMatch);
        setLoading(false);
      });
  }, [matchId, token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Caricamento...</div>;
  }
  if (error || !match) {
    return <div className="min-h-screen flex items-center justify-center text-destructive">{error || 'Errore'}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-2xl py-12">
        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">Report condiviso</p>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase leading-tight">
              {match.home_team_name} vs {match.away_team_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {match.match_date} {match.league ? `· ${match.league}` : ''}
            </p>
          </div>
          <div className="text-center py-8 border-y border-border">
            <p className="text-7xl font-black italic text-primary">
              {match.home_sets_won} — {match.away_sets_won}
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">set vinti</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">Generato con VolleyScout Pro</p>
        </div>
      </div>
    </div>
  );
}
