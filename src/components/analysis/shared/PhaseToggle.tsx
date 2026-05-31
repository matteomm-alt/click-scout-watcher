export function PhaseToggle({ value, onChange }: { value: 'all' | 'K1' | 'K2'; onChange: (v: 'all' | 'K1' | 'K2') => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        ['all', 'Tutti'], ['K1', 'K1 — Cambio palla'], ['K2', 'K2 — Break point'],
      ].map(([key, label]) => (
        <button key={key} onClick={() => onChange(key as 'all' | 'K1' | 'K2')}
          className={`min-h-9 px-3 text-xs font-bold rounded-lg border transition-colors ${value === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'}`}
        >{label}</button>
      ))}
    </div>
  );
}
