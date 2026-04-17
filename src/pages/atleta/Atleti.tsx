import { UserCircle } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Atleti() {
  return (
    <PlaceholderPage
      block="atleta"
      icon={UserCircle}
      title="Atleti"
      description="Anagrafica completa, ruolo, numero, capitano/libero, note tecniche."
    />
  );
}
