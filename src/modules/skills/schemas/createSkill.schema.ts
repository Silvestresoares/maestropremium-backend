import { z } from 'zod';

export const createSkillSchema = z.object({
  name: z.string({ required_error: 'O nome da habilidade é obrigatório' })
    .min(1, 'O nome não pode estar vazio')
    .max(255, 'O nome deve ter no máximo 255 caracteres'),
});

export type CreateSkillRawData = z.infer<typeof createSkillSchema>;
