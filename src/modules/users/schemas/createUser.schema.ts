import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string({ required_error: 'O nome é obrigatório' })
    .min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').optional(),
});

// Alterado de 'public type' para 'export type' 🛠️
export type CreateUserRawData = z.infer<typeof createUserSchema>;