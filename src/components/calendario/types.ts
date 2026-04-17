import type { Database } from '@/integrations/supabase/types';

type EventRow = Database['public']['Tables']['events']['Row'];

export interface CalendarEvent extends EventRow {
  /** Iniettato lato client per gli admin che vedono eventi creati da altri */
  creator_name?: string | null;
}
