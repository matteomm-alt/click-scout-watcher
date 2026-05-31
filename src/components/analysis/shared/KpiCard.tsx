import { Card } from '@/components/ui/card';

export function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-4xl font-black italic">{value}</p>
    </Card>
  );
}
