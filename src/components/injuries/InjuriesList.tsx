import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CalendarDays, Stethoscope } from 'lucide-react';
import {
  AthleteInjury,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  daysSince,
} from '@/lib/injuries';

interface Props {
  injuries: AthleteInjury[];
  onEdit?: (i: AthleteInjury) => void;
  onDelete?: (i: AthleteInjury) => void;
  showAthlete?: (athleteId: string) => string;
  emptyLabel?: string;
}

/**
 * Lista compatta degli infortuni — usata sia nella scheda atleta che nella vista globale.
 */
export function InjuriesList({ injuries, onEdit, onDelete, showAthlete, emptyLabel }: Props) {
  if (injuries.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {emptyLabel ?? 'Nessun infortunio registrato.'}
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {injuries.map((inj) => {
        const days = daysSince(inj.start_date, inj.actual_return_date);
        return (
          <Card key={inj.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {showAthlete && (
                    <span className="font-bold text-sm">{showAthlete(inj.athlete_id)}</span>
                  )}
                  <span className="font-semibold">{inj.body_part}</span>
                  {inj.injury_type && (
                    <span className="text-xs text-muted-foreground">— {inj.injury_type}</span>
                  )}
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${SEVERITY_BADGE[inj.severity]}`}>
                    {SEVERITY_LABEL[inj.severity]}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${STATUS_BADGE[inj.status]}`}>
                    {STATUS_LABEL[inj.status]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    Dal {new Date(inj.start_date).toLocaleDateString('it-IT')}
                    {inj.actual_return_date
                      ? ` al ${new Date(inj.actual_return_date).toLocaleDateString('it-IT')}`
                      : inj.expected_return_date
                        ? ` (rientro previsto ${new Date(inj.expected_return_date).toLocaleDateString('it-IT')})`
                        : ''}
                  </span>
                  <span className="font-semibold text-foreground">
                    {days} giorni{inj.status === 'risolto' ? ' di stop' : ' (in corso)'}
                  </span>
                </div>

                {inj.doctor_notes && (
                  <p className="mt-2 text-xs flex items-start gap-1 text-muted-foreground">
                    <Stethoscope className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><span className="font-semibold">Medico:</span> {inj.doctor_notes}</span>
                  </p>
                )}
                {inj.notes && (
                  <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Note:</span> {inj.notes}</p>
                )}
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(inj)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(inj)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
