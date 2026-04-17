import { Boxes } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Inventario() {
  return (
    <PlaceholderPage
      block="atleta"
      icon={Boxes}
      title="Inventario assegnazioni"
      description="Vista per atleta: cosa gli è stato consegnato, quando, restituzioni, scorte."
    />
  );
}
