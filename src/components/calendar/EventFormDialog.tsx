import type React from 'react';
import {
  format, } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as Plus, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EVENT_TYPES, type EventType, getEventColors } from '@/lib/eventTypes';
import type { CalendarEvent } from '@/components/calendario/types';
import { cn } from '@/lib/utils';

export interface TeamLite {
  id: string;
  name: string;
}

export interface EventForm {
  title: string;
  event_type: EventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  team_id: string;
}

export interface EventFormDialogProps {
  newEventOpen: boolean;
  setNewEventOpen: (o: boolean) => void;
  editingEvent: CalendarEvent | null;
  savingEvent: boolean;
  eventForm: EventForm;
  setEventForm: React.Dispatch<React.SetStateAction<EventForm>>;
  teams: TeamLite[];
  recurrence: { enabled: boolean; interval: 'week' | 'biweek' | 'month'; count: number };
  setRecurrence: React.Dispatch<React.SetStateAction<{ enabled: boolean; interval: 'week' | 'biweek' | 'month'; count: number }>>;
  recurrenceDates: Date[];
  isPartOfSeries: (evt: CalendarEvent) => boolean;
  saveEvent: (scope?: 'single' | 'series') => void | Promise<void>;
  deleteEvent: (scope?: 'single' | 'series') => void | Promise<void>;
  shiftEventForm: (days: number) => void;
  setPendingScopeAction: (a: 'save' | 'delete' | null) => void;
}

export function EventFormDialog({
  newEventOpen, setNewEventOpen, editingEvent, savingEvent, eventForm, setEventForm, teams,
  recurrence, setRecurrence, recurrenceDates, isPartOfSeries, saveEvent, deleteEvent,
  shiftEventForm, setPendingScopeAction,
}: EventFormDialogProps) {
  return (
    <>
      {/* Dialog crea/modifica evento */}
      <Dialog
        open={newEventOpen}
        onOpenChange={(o) => {
          setNewEventOpen(o);
          if (!o) setRecurrence({ enabled: false, interval: 'week', count: 8 });
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Modifica evento' : 'Nuovo evento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Titolo *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Es. Allenamento Under 18"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider flex items-center gap-2">
                Tipo
                <span
                  className="inline-block w-3 h-3 rounded-full border"
                  style={{ background: getEventColors(eventForm.event_type).bg, borderColor: getEventColors(eventForm.event_type).border }}
                />
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = eventForm.event_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setEventForm((f) => ({ ...f, event_type: t.value }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                        active
                          ? `${t.bgClass} ${t.textClass} border-current`
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Inizio *</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.start_at}
                  onChange={(e) => setEventForm((f) => ({ ...f, start_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Fine</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.end_at}
                  onChange={(e) => setEventForm((f) => ({ ...f, end_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Luogo</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Palestra, indirizzo…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Squadra</Label>
              <Select
                value={eventForm.team_id || 'none'}
                onValueChange={(v) => setEventForm((f) => ({ ...f, team_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona squadra…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna squadra</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Note</Label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {editingEvent && (
              <div className="space-y-2 border border-border rounded-lg p-3 bg-secondary/30">
                <Label className="text-xs uppercase tracking-wider">Sposta solo questo evento</Label>
                <div className="flex flex-wrap gap-1.5">
                  {([['-7', '− 1 sett.'], ['-1', '− 1 g'], ['1', '+ 1 g'], ['7', '+ 1 sett.']] as [string, string][]).map(([days, label]) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => shiftEventForm(Number(days))}
                      className="px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-bold hover:border-primary/40 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le nuove date vengono applicate al salvataggio (scegli "Solo questo evento" se fa parte di una serie).
                </p>
              </div>
            )}

            {(!editingEvent || !isPartOfSeries(editingEvent)) && (
              <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider">
                    {editingEvent ? 'Rendi ricorrente da qui' : 'Ripeti evento'}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setRecurrence((r) => ({ ...r, enabled: !r.enabled }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors relative',
                      recurrence.enabled ? 'bg-primary' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all',
                        recurrence.enabled ? 'left-[22px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>

                {recurrence.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Ogni</span>
                      <select
                        value={recurrence.interval}
                        onChange={(e) =>
                          setRecurrence((r) => ({
                            ...r,
                            interval: e.target.value as 'week' | 'biweek' | 'month',
                          }))
                        }
                        className="flex-1 h-8 rounded-md border border-border bg-secondary text-xs px-2"
                      >
                        <option value="week">Settimana</option>
                        <option value="biweek">2 Settimane</option>
                        <option value="month">Mese</option>
                      </select>
                      <span className="text-muted-foreground">per</span>
                      <select
                        value={recurrence.count}
                        onChange={(e) =>
                          setRecurrence((r) => ({ ...r, count: Number(e.target.value) }))
                        }
                        className="w-20 h-8 rounded-md border border-border bg-secondary text-xs px-2"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20].map((n) => (
                          <option key={n} value={n}>{n} volte</option>
                        ))}
                      </select>
                    </div>

                    {recurrenceDates.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground uppercase tracking-wider font-bold">
                          Anteprima ({recurrenceDates.length + 1} eventi totali):
                        </p>
                        <p>
                          1. {eventForm.start_at
                            ? format(new Date(eventForm.start_at), 'EEE d MMM yyyy', { locale: it })
                            : '—'} <span className="text-primary">← questo</span>
                        </p>
                        {recurrenceDates.slice(0, 4).map((d, i) => (
                          <p key={i}>
                            {i + 2}. {format(d, 'EEE d MMM yyyy', { locale: it })}
                          </p>
                        ))}
                        {recurrenceDates.length > 4 && (
                          <p className="text-muted-foreground italic">
                            … e altri {recurrenceDates.length - 4} eventi
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => isPartOfSeries(editingEvent) ? setPendingScopeAction('delete') : deleteEvent('single')}
                disabled={savingEvent}
                className="mr-auto"
              >
                Elimina
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setNewEventOpen(false)}
              disabled={savingEvent}
            >
              Annulla
            </Button>
            <Button
              onClick={() => editingEvent && isPartOfSeries(editingEvent) ? setPendingScopeAction('save') : saveEvent('single')}
              disabled={!eventForm.title.trim() || !eventForm.start_at || savingEvent}
              className="gap-2"
            >
              {savingEvent ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" />
                  Salvataggio…
                </>
              ) : editingEvent ? (
                'Salva modifiche'
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Crea evento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
