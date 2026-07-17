import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string({ required_error: 'O título do evento é obrigatório' }),
  description: z.string().optional(),
  date_time: z.string({ required_error: 'A data e hora são obrigatórias' }).datetime({ message: 'Formato de data inválido (Use ISO 8601)' }),
});

export const createScheduleSchema = z.object({
  event_id: z.string({ required_error: 'O ID do evento é obrigatório' }).uuid('ID do evento inválido'),
  user_id: z.number({ required_error: 'O ID do voluntário é obrigatório' }),
  skill_id: z.string({ required_error: 'O ID da habilidade é obrigatório' })
});

export type CreateEventRawData = z.infer<typeof createEventSchema>;
export type CreateScheduleRawData = z.infer<typeof createScheduleSchema>;