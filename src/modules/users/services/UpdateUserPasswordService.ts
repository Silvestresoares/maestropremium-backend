import bcrypt from 'bcryptjs';
import { UsersRepository } from '../repositories/UsersRepository';
import { AppError } from '../../../shared/errors/AppError';
import { z } from 'zod';

const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres')
});

export class UpdateUserPasswordService {
  async execute(userId: number, data: any): Promise<void> {
    const validatedData = updatePasswordSchema.parse(data);

    const usersRepository = new UsersRepository();
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Verificar se a senha antiga confere
    const passwordMatch = await bcrypt.compare(validatedData.oldPassword, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('A senha atual está incorreta', 401);
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    // Atualizar no banco
    await usersRepository.updatePassword(userId, hashedPassword);
  }
}
