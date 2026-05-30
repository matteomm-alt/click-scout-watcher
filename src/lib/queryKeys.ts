// Query key factories — unica fonte di verità per tutte le cache keys
// Uso: queryKeys.athletes.list(societyId) → ['athletes', societyId]

export const queryKeys = {
  athletes: {
    all: (societyId: string) => ['athletes', societyId] as const,
    injuries: (societyId: string) => ['athletes', 'injuries', societyId] as const,
    detail: (id: string) => ['athletes', 'detail', id] as const,
  },
  trainings: {
    all: (societyId: string) => ['trainings', societyId] as const,
    blocks: (trainingId: string) => ['trainings', 'blocks', trainingId] as const,
  },
  exercises: {
    all: (societyId: string) => ['exercises', societyId] as const,
  },
  dashboard: {
    all: (societyId: string, userId: string) =>
      ['dashboard', societyId, userId] as const,
    events: (societyId: string) => ['events', 'next', societyId] as const,
    matches: (userId: string) => ['matches', 'kpi', userId] as const,
    trainings: (societyId: string) => ['trainings', 'recent', societyId] as const,
    attendance: (societyId: string) => ['attendance', 'alerts', societyId] as const,
  },
  match: {
    detail: (id: string) => ['match', id] as const,
    actions: (id: string) => ['match', 'actions', id] as const,
    players: (teamIds: string[]) => ['match', 'players', ...teamIds] as const,
  },
  attendances: {
    byEvent: (eventId: string) => ['attendances', 'event', eventId] as const,
    summary: (societyId: string) => ['attendances', 'summary', societyId] as const,
  },
  communications: {
    all: (societyId: string) => ['communications', societyId] as const,
  },
  opponent: {
    detail: (id: string) => ['opponent', id] as const,
    matches: (teamId: string) => ['opponent', 'matches', teamId] as const,
  },
} as const;
