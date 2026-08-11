import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { DbAction } from '@/lib/scoutAnalysis';

interface ReportRow {
  id: string;
  scout_match_id: string | null;
  match_label: string;
  home_team: string;
  away_team: string;
  match_date: string | null;
  generated_from: string;
  created_at: string;
}

export function ReportPdfList() {
  const { societyId } = useActiveSociety();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_pdfs')
        .select('*')
        .eq('society_id', societyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) toast.error('Impossibile caricare i report');
      setRows((data ?? []) as ReportRow[]);
      setLoading(false);
    })();
  }, [societyId]);

  const regenerate = async (report: ReportRow) => {
    if (!report.scout_match_id) { toast.error('Partita non collegata'); return; }
    setBusyId(report.id);
    try {
      const { data: match } = await supabase
        .from('scout_matches')
        .select('*, home_team:home_team_id(name,id), away_team:away_team_id(name,id)')
        .eq('id', report.scout_match_id)
        .single();
      const { data: actions } = await supabase
        .from('scout_actions')
        .select('*')
        .eq('scout_match_id', report.scout_match_id)
        .order('action_index');
      if (!match || !actions) { toast.error('Dati partita non trovati'); return; }
      const { data: players } = await supabase
        .from('scout_players')
        .select('scout_team_id, number, last_name, first_name, role')
        .in('scout_team_id', [match.home_team_id, match.away_team_id]);
      const home = match.home_team as unknown as { id: string; name: string };
      const away = match.away_team as unknown as { id: string; name: string };
      const meta = {
        homeName: home?.name ?? 'Casa',
        awayName: away?.name ?? 'Ospite',
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        date: match.match_date || '',
        venue: match.venue || '',
        league: match.league || '',
        setResults: Array.isArray(match.set_results)
          ? (match.set_results as unknown as Array<{ intermediates?: string[]; duration?: string | number }>)
          : [],
        homeSetsWon: match.home_sets_won,
        awaySetsWon: match.away_sets_won,
      };
      const { downloadMatchReport } = await import('@/lib/pdfReport');
      downloadMatchReport(meta, (actions ?? []) as unknown as DbAction[], players ?? []);
      toast.success('Report rigenerato');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('report_pdfs').delete().eq('id', id);
    if (error) { toast.error('Impossibile eliminare il report'); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    toast.success('Report eliminato');
  };

  if (loading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nessun report generato ancora.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <Card key={r.id} className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="font-bold uppercase italic text-sm">{r.match_label}</p>
            <p className="text-xs text-muted-foreground">
              Generato il {new Date(r.created_at).toLocaleString('it-IT')}
              {r.match_date ? ` · Partita del ${r.match_date}` : ''}
              {` · ${r.generated_from === 'live' ? 'Scout live' : 'Archivio'}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === r.id}
            onClick={() => regenerate(r)}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {busyId === r.id ? 'Rigenero…' : 'Rigenera PDF'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" title="Elimina">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare questo report?</AlertDialogTitle>
                <AlertDialogDescription>
                  Il log del report verrà rimosso. La partita non viene toccata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remove(r.id)}
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      ))}
    </div>
  );
}

export default ReportPdfList;
