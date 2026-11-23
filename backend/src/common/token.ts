import { customAlphabet } from 'nanoid';

// No ambiguous chars (0/O, 1/I/L)
const gen = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);
export const newQrToken = (): string => `TBL-${gen()}`;
