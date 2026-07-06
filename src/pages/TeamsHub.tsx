import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

interface TeamRow {
  id: string;
  name: string;
  category: string | null;
  age_group: string | null;
  season: string | null;
  athletes: { id: string }[] | null;
}

export default function TeamsHub() {
  const { societyId } = useActiveSociety();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    supabase
      .from('teams')
      .select('*, athletes(id)')
      .eq('society_id', societyId)
      .order('name')
      .then(({ data }) => {
        setTeams((data as TeamRow[]) ?? []);
        setLoading(false);
      });
  }, [societyId]);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-black uppercase italic tracking-tight">Squadre</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seleziona una squadra per aprirne la dashboard.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessuna squadra trovata. Crea una squadra dalle Impostazioni.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <Link key={t.id} to={`/squadre/${t.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold uppercase italic">{t.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {t.category && <Badge variant="secondary">{t.category}</Badge>}
                    {t.age_group && <Badge variant="outline">{t.age_group}</Badge>}
                    {t.season && <Badge variant="outline">{t.season}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{t.athletes?.length ?? 0} atleti</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
