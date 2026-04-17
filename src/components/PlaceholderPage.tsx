import { LucideIcon, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  block: 'gestionale' | 'coaching' | 'analisi' | 'atleta';
}

const BLOCK_LABEL: Record<PlaceholderPageProps['block'], string> = {
  gestionale: 'Gestionale Società',
  coaching: 'Coaching',
  analisi: 'Analisi DVW Avanzata',
  atleta: 'Atleta & Magazzino',
};

export default function PlaceholderPage({ title, description, icon: Icon, block }: PlaceholderPageProps) {
  return (
    <div className="container py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
        {BLOCK_LABEL[block]}
      </p>
      <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-[0.9] tracking-tight mb-3 flex items-center gap-4">
        {Icon && <Icon className="w-10 h-10 text-primary" />}
        {title}
      </h1>
      <p className="text-muted-foreground max-w-2xl mb-10">{description}</p>

      <div className="rounded-xl border border-dashed border-border bg-card p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
        <Construction className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold uppercase italic tracking-tight mb-2">In costruzione</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Questa sezione è stata predisposta nello scaffold. Le tabelle DB e le RLS sono già pronte.
          Il contenuto verrà implementato nelle prossime iterazioni.
        </p>
      </div>
    </div>
  );
}
