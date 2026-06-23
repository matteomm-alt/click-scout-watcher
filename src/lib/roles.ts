/**
 * Ruoli applicativi sincronizzati con l'enum `app_role` in DB.
 */
export type AppRole =
  | 'super_admin'
  | 'society_admin'
  | 'coach'
  | 'scout'
  | 'direttore_tecnico';

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  society_admin: 'Admin società',
  coach: 'Coach',
  scout: 'Scout',
  direttore_tecnico: 'Direttore tecnico',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Accesso totale a tutte le società.',
  society_admin: 'Gestione completa della società: membri, atleti, impostazioni.',
  coach: 'Allenamenti, convocazioni, valutazioni, scout live.',
  scout: 'Inserimento dati partita in tempo reale (scout live).',
  direttore_tecnico: 'Supervisione tecnica trasversale di squadre e coach.',
};

/** Ruoli che un society_admin può assegnare/revocare nella propria società. */
export const SOCIETY_ASSIGNABLE_ROLES: AppRole[] = [
  'society_admin',
  'coach',
  'direttore_tecnico',
  'scout',
];
