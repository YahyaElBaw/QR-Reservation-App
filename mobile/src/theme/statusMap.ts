export type Tone = 'info' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

export const ticketStatusUI = {
  OPEN: { label: 'Ouvert', tone: 'info' as Tone, icon: 'receipt' },
  PAID: { label: 'Payé', tone: 'accent' as Tone, icon: 'banknote' },
  CLOSED: { label: 'Fermé', tone: 'neutral' as Tone, icon: 'lock' },
} as const;

export const tableStatusUI = {
  AVAILABLE: { label: 'Disponible', tone: 'success' as Tone, icon: 'circle-check' },
  RESERVED: { label: 'Occupée', tone: 'warning' as Tone, icon: 'users' },
} as const;
