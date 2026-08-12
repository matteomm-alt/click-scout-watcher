import { useCurrentSeason } from '@/hooks/useCurrentSeason';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SeasonSelector({ className = '' }: { className?: string }) {
  const { currentSeason, setCurrentSeason, availableSeasons } = useCurrentSeason();
  return (
    <Select value={currentSeason} onValueChange={setCurrentSeason}>
      <SelectTrigger className={`h-7 text-xs font-semibold ${className}`} aria-label="Stagione">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableSeasons.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
