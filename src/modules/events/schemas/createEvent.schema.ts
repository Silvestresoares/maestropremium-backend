import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional().nullable(),
  date_time: z.string().datetime('Data e hora inválida'),
});

export type CreateEventRawData = z.infer<typeof createEventSchema>;
