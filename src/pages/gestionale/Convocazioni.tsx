import { ListChecks } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Convocazioni() {
  return (
    <PlaceholderPage
      block="gestionale"
      icon={ListChecks}
      title="Convocazioni"
      description="Crea distinte gara: titolari, riserve, libero. Esporta PDF/foglio gara."
    />
  );
}
