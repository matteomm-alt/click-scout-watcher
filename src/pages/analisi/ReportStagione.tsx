import { PieChart } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function ReportStagione() {
  return (
    <PlaceholderPage
      block="analisi"
      icon={PieChart}
      title="Report stagione"
      description="Aggregazione cross-match della tua squadra: trend, KPI per atleta e per fondamentale lungo la stagione."
    />
  );
}
