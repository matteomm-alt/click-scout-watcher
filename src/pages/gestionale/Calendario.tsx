import { Calendar } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Calendario() {
  return (
    <PlaceholderPage
      block="gestionale"
      icon={Calendar}
      title="Calendario eventi"
      description="Allenamenti, partite, riunioni e tornei della società. Vista mensile e settimanale, drag & drop."
    />
  );
}
