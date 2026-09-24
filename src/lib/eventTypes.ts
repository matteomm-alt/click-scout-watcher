import { Dumbbell, Trophy, Users, Award, Calendar, LucideIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

export type EventType = Database['public']['Enums']['event_type'];

export interface EventTypeMeta {
  value: EventType;
  label: string;
  icon: LucideIcon;
  /** HSL classes già mappate ai token semantici/diretti */
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export const EVENT_TYPES: EventTypeMeta[] = [
  {
    value: 'allenamento',
    label: 'Allenamento',
    icon: Dumbbell,
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-400',
    borderClass: 'border-l-blue-500',
    dotClass: 'bg-blue-500',
  },
  {
    value: 'partita',
    label: 'Partita',
    icon: Trophy,
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-l-red-500',
    dotClass: 'bg-red-500',
  },
  {
    value: 'riunione',
    label: 'Riunione',
    icon: Users,
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-l-purple-500',
    dotClass: 'bg-purple-500',
  },
  {
    value: 'torneo',
    label: 'Torneo',
    icon: Award,
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-l-orange-500',
    dotClass: 'bg-orange-500',
  },
  {
    value: 'altro',
    label: 'Altro',
    icon: Calendar,
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    borderClass: 'border-l-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
];

export function getEventMeta(type: EventType): EventTypeMeta {
  return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[4];
}

/** Colori espliciti per tipo evento (card calendario, form). */
export const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  allenamento: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  partita: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  riunione: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  torneo: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  altro: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
};

export function getEventColors(type: string) {
  return EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.altro;
}
