import { useMemo, useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Tag as TagIcon, X, Check } from 'lucide-react';
import { PREDEFINED_TAG_GROUPS, normalizeTag } from '@/lib/volleyConstants';
import { cn } from '@/lib/utils';

interface TagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tag già usati nella società (autocomplete). */
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

/**
 * TagPicker: combina tag predefiniti raggruppati per categoria + tag custom liberi.
 * - Mostra i tag selezionati come badge rimovibili.
 * - Popover con tutte le categorie predefinite (toggle) + sezione "Già usati nella società".
 * - Input libero per aggiungere tag custom (Enter o virgola per confermare).
 */
export function TagPicker({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Aggiungi tag…',
  className,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const selectedSet = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);

  const toggleTag = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    if (selectedSet.has(t.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== t.toLowerCase()));
    } else {
      onChange([...value, t]);
    }
  };

  const removeTag = (t: string) => {
    onChange(value.filter((v) => v !== t));
  };

  const commitDraft = () => {
    const parts = draft.split(',').map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    parts.forEach((t) => {
      if (!next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    });
    onChange(next);
    setDraft('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  // Tag già usati che NON sono predefiniti (per evitare doppioni nel popover)
  const predefinedFlat = useMemo(
    () => new Set(PREDEFINED_TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.toLowerCase()))),
    []
  );
  const customSuggestions = useMemo(
    () => Array.from(new Set(suggestions.map(normalizeTag).filter(Boolean)))
      .filter((t) => !predefinedFlat.has(t.toLowerCase()))
      .sort((a, b) => a.localeCompare(b)),
    [suggestions, predefinedFlat]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Tag selezionati */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              <TagIcon className="w-3 h-3" />
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="ml-0.5 rounded hover:bg-background/50 p-0.5"
                aria-label={`Rimuovi ${t}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input + popover */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commitDraft}
          placeholder={placeholder}
          className="flex-1"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Scegli da elenco">
              <Plus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="end">
            <ScrollArea className="max-h-[400px]">
              <div className="p-3 space-y-4">
                {PREDEFINED_TAG_GROUPS.map((group) => (
                  <div key={group.category}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {group.tags.map((t) => {
                        const sel = selectedSet.has(t.toLowerCase());
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTag(t)}
                            className={cn(
                              'text-xs px-2 py-1 rounded border transition-colors inline-flex items-center gap-1',
                              sel
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'border-border hover:border-primary/40 hover:bg-muted'
                            )}
                          >
                            {sel && <Check className="w-3 h-3" />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {customSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Già usati nella società
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {customSuggestions.map((t) => {
                        const sel = selectedSet.has(t.toLowerCase());
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTag(t)}
                            className={cn(
                              'text-xs px-2 py-1 rounded border transition-colors inline-flex items-center gap-1',
                              sel
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'border-border hover:border-primary/40 hover:bg-muted'
                            )}
                          >
                            {sel && <Check className="w-3 h-3" />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
