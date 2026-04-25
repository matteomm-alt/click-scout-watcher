import { Filter } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EVENT_TYPES, type EventType } from '@/lib/eventTypes';
import { cn } from '@/lib/utils';

interface CalendarFiltersProps {
  selectedTypes: EventType[];
  onTypesChange: (types: EventType[]) => void;
  teams: string[];
  selectedTeam: string;
  onTeamChange: (team: string) => void;
}

export function CalendarFilters({
  selectedTypes,
  onTypesChange,
  teams,
  selectedTeam,
  onTeamChange,
}: CalendarFiltersProps) {
  const toggleType = (type: EventType) => {
    onTypesChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((item) => item !== type)
        : [...selectedTypes, type],
    );
  };

  return (
    <div className="border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-4 w-4 text-primary" />
        Filtri calendario
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider">Tipo evento</p>
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPES.map((type) => {
              const Icon = type.icon;
              const checked = selectedTypes.includes(type.value);

              return (
                <Label
                  key={type.value}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-wider transition-colors',
                    checked && 'border-primary bg-primary/10 text-primary',
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleType(type.value)} />
                  <Icon className={cn('h-3.5 w-3.5', checked ? 'text-primary' : type.textClass)} />
                  {type.label}
                </Label>
              );
            })}
          </div>
        </div>

        <div className="w-full space-y-2 lg:w-72">
          <p className="text-xs font-bold uppercase tracking-wider">Squadra</p>
          <Select value={selectedTeam} onValueChange={onTeamChange}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Tutte le squadre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le squadre</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}