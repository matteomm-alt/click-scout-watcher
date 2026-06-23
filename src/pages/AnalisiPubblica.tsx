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

interface PublicStats {
  total_actions: number;
  total_sets: number;
  home_points: number;
  away_points: number;
  skill_breakdown: Record<string, number>;
}

const SKILL_LABELS: Record<string, string> = {
  S: 'Battute', R: 'Ricezioni', A: 'Attacchi', B: 'Muri', D: 'Difese', E: 'Alzate', F: 'Free ball',
};

export default function AnalisiPubblica() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !token) {
      setError('Link non valido');
      setLoading(false);
      return;
    }
    Promise.all([
      supabase.rpc('get_public_shared_match', { _match_id: matchId, _token: token }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('get_public_shared_match_stats', { _match_id: matchId, _token: token }),
    ]).then(([{ data, error: e }, { data: sData }]) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (e || !row) { setError('Link non valido o scaduto.'); setLoading(false); return; }
      setMatch(row as PublicMatch);
      const sRow = Array.isArray(sData) ? sData[0] : null;
      if (sRow) setStats(sRow as PublicStats);
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
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Azioni totali</p>
                  <p className="text-2xl font-black italic">{stats.total_actions}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Set giocati</p>
                  <p className="text-2xl font-black italic">{stats.total_sets}</p>
                </div>
              </div>
              {Object.keys(stats.skill_breakdown || {}).length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Distribuzione fondamentali</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {Object.entries(stats.skill_breakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 border-b border-border/50 py-1">
                        <span className="text-muted-foreground">{SKILL_LABELS[k] || k}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">Generato con VolleyScout Pro</p>
        </div>
      </div>
    </div>
  );
}
