import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, HeartPulse } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AthleteInjury } from '@/lib/injuries';
import { InjuriesList } from '@/components/injuries/InjuriesList';
import { InjuryFormDialog } from '@/components/injuries/InjuryFormDialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  athleteId: string;
  athleteLabel: string;
}

/**
 * Dialog con storico completo degli infortuni di un singolo atleta.
 */
export function AthleteInjuriesDialog({ open, onOpenChange, athleteId, athleteLabel }: Props) {
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AthleteInjury | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('athlete_injuries')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('start_date', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Errore caricamento storico');
    }
    setInjuries((data ?? []) as AthleteInjury[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && athleteId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, athleteId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('athlete_injuries').delete().eq('id', deleteId);
    if (error) { toast.error('Errore eliminazione'); return; }
    toast.success('Infortunio rimosso');
    setDeleteId(null);
    load();
  };

  const active = injuries.filter((i) => i.status === 'attivo').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary" />
              Infortuni — {athleteLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between pb-2">
            <p className="text-xs text-muted-foreground">
              {injuries.length} eventi totali · {active} attivi
            </p>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Nuovo
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : (
            <InjuriesList
              injuries={injuries}
              onEdit={(i) => { setEditing(i); setFormOpen(true); }}
              onDelete={(i) => setDeleteId(i.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <InjuryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        athleteId={athleteId}
        injury={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'infortunio?</AlertDialogTitle>
            <AlertDialogDescription>Operazione non reversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
